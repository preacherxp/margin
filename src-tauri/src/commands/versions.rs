use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::command;

use super::error::{AppError, AppResult};
use super::posts::{parse_frontmatter, posts_dir};

const VERSIONS_DIR: &str = ".versions";
const MAX_VERSIONS_PER_POST: usize = 50;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionMeta {
    pub post_id: String,
    pub ts: String,
    pub bytes: u64,
    pub preview: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionContent {
    pub post_id: String,
    pub ts: String,
    pub content: String,
    pub updated_at: String,
    pub title: String,
}

fn versions_dir(posts_dir: &Path) -> PathBuf {
    posts_dir.join(VERSIONS_DIR)
}

fn post_versions_dir(posts_dir: &Path, post_id: &str) -> PathBuf {
    versions_dir(posts_dir).join(post_id)
}

fn sanitize_post_id(post_id: &str) -> AppResult<String> {
    if post_id.is_empty() {
        return Err(AppError::Invalid("post id is empty".into()));
    }
    if post_id.contains('/') || post_id.contains('\\') || post_id.contains("..") {
        return Err(AppError::Invalid(format!("invalid post id: {post_id}")));
    }
    Ok(post_id.to_string())
}

fn sanitize_ts(ts: &str) -> AppResult<String> {
    if ts.is_empty()
        || ts.contains('/')
        || ts.contains('\\')
        || ts.contains("..")
        || ts.contains('\0')
    {
        return Err(AppError::Invalid(format!("invalid version ts: {ts}")));
    }
    Ok(ts.to_string())
}

fn preview_from_content(content: &str) -> String {
    let body = match parse_frontmatter(content) {
        Ok((_, body)) => body,
        Err(_) => content.to_string(),
    };
    let first = body
        .lines()
        .map(str::trim)
        .find(|l| !l.is_empty())
        .unwrap_or("");
    let mut out: String = first.chars().take(80).collect();
    if first.chars().count() > 80 {
        out.push('…');
    }
    out
}

fn title_from_content(content: &str) -> String {
    match parse_frontmatter(content) {
        Ok((value, _)) => value
            .get("title")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_default(),
        Err(_) => String::new(),
    }
}

fn updated_at_from_content(content: &str) -> String {
    match parse_frontmatter(content) {
        Ok((value, _)) => value
            .get("updatedAt")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_default(),
        Err(_) => String::new(),
    }
}

fn parse_ts(ts: &str) -> Option<DateTime<Utc>> {
    let mut s = ts.to_string();
    let bytes = s.as_bytes();
    if bytes.len() >= 18 && bytes.get(13) == Some(&b'-') && bytes.get(16) == Some(&b'-') {
        let mut buf = String::with_capacity(s.len());
        buf.push_str(&s[..13]);
        buf.push(':');
        buf.push_str(&s[14..16]);
        buf.push(':');
        buf.push_str(&s[17..]);
        s = buf;
    }
    DateTime::parse_from_rfc3339(&s)
        .ok()
        .map(|d| d.with_timezone(&Utc))
}

fn ensure_posts_dir(folder: &Path) -> AppResult<PathBuf> {
    let dir = posts_dir(folder);
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

#[command]
pub fn save_version(folder: PathBuf, post_id: String, content: String) -> AppResult<VersionMeta> {
    let post_id = sanitize_post_id(&post_id)?;
    let dir = ensure_posts_dir(&folder)?;
    let ts = Utc::now().format("%Y-%m-%dT%H-%M-%S%.3fZ").to_string();
    let pdir = post_versions_dir(&dir, &post_id);
    std::fs::create_dir_all(&pdir)?;
    let path = pdir.join(format!("{ts}.md"));
    std::fs::write(&path, content.as_bytes())?;

    let bytes = content.as_bytes().len() as u64;
    let preview = preview_from_content(&content);
    let meta = VersionMeta {
        post_id: post_id.clone(),
        ts: ts.clone(),
        bytes,
        preview,
    };

    prune_versions(&pdir)?;

    Ok(meta)
}

#[command]
pub fn list_versions(folder: PathBuf, post_id: String) -> AppResult<Vec<VersionMeta>> {
    let post_id = sanitize_post_id(&post_id)?;
    let dir = ensure_posts_dir(&folder)?;
    let pdir = post_versions_dir(&dir, &post_id);
    if !pdir.exists() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&pdir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let name = path
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        if name.starts_with('.') {
            continue;
        }
        let ts = name.to_string();
        if parse_ts(&ts).is_none() {
            continue;
        }
        let bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        let preview = preview_from_content(&content);
        out.push(VersionMeta {
            post_id: post_id.clone(),
            ts,
            bytes,
            preview,
        });
    }
    out.sort_by(|a, b| b.ts.cmp(&a.ts));
    Ok(out)
}

#[command]
pub fn read_version(folder: PathBuf, post_id: String, ts: String) -> AppResult<VersionContent> {
    let post_id = sanitize_post_id(&post_id)?;
    let ts = sanitize_ts(&ts)?;
    let dir = ensure_posts_dir(&folder)?;
    let pdir = post_versions_dir(&dir, &post_id);
    let path = pdir.join(format!("{ts}.md"));
    if !path.exists() {
        return Err(AppError::NotFound(path.to_string_lossy().to_string()));
    }
    let content = std::fs::read_to_string(&path)?;
    let updated_at = updated_at_from_content(&content);
    let title = title_from_content(&content);
    Ok(VersionContent {
        post_id,
        ts,
        content,
        updated_at,
        title,
    })
}

#[command]
pub fn delete_versions_for_post(folder: PathBuf, post_id: String) -> AppResult<()> {
    let post_id = sanitize_post_id(&post_id)?;
    let dir = posts_dir(&folder);
    let pdir = post_versions_dir(&dir, &post_id);
    if pdir.exists() {
        std::fs::remove_dir_all(&pdir)?;
    }
    Ok(())
}

fn prune_versions(post_versions_path: &Path) -> AppResult<()> {
    if !post_versions_path.exists() {
        return Ok(());
    }
    let mut entries: Vec<(String, PathBuf)> = Vec::new();
    for entry in std::fs::read_dir(post_versions_path)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let name = path
            .file_stem()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .unwrap_or_default();
        if name.is_empty() || parse_ts(&name).is_none() {
            continue;
        }
        entries.push((name, path));
    }
    entries.sort_by(|a, b| b.0.cmp(&a.0));
    while entries.len() > MAX_VERSIONS_PER_POST {
        if let Some((_, p)) = entries.pop() {
            let _ = std::fs::remove_file(&p);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_post_file(dir: &Path, id: &str, title: &str, body: &str) -> String {
        let content = format!(
            "---\nid: {id}\ntitle: {title}\nstatus: draft\ntype: linkedin\n\
             createdAt: 2026-06-02T10:00:00.000Z\nupdatedAt: 2026-06-02T10:00:00.000Z\n\
             scheduledFor: null\npublishedAt: null\ntags: []\ntemplate: null\n\
             path: {id}.md\nlinkedin:\n  hook: \"\"\n  cta: \"\"\n  hashtags: []\n  audience: \"\"\n\
             assets: []\nversions: 0\n---\n{body}\n"
        );
        std::fs::write(dir.join(format!("{id}.md")), &content).unwrap();
        content
    }

    #[test]
    fn preview_uses_first_non_empty_line() {
        let preview = preview_from_content(
            "---\nid: a\ntitle: A\n---\n\n# Heading\n\nFirst line.\n",
        );
        assert_eq!(preview, "# Heading");
    }

    #[test]
    fn preview_truncates_long_lines() {
        let long: String = "x".repeat(200);
        let preview = preview_from_content(&format!("---\nid: a\n---\n{long}\n"));
        assert_eq!(preview.chars().count(), 81);
        assert!(preview.ends_with('…'));
    }

    #[test]
    fn save_and_list_round_trip() {
        let folder = tempdir();
        let pdir = posts_dir(&folder);
        std::fs::create_dir_all(&pdir).unwrap();
        let id = "01HXY1STORY0000000000000000";
        let content = write_post_file(&pdir, id, "Title", "Body line");
        let m = save_version(folder.clone(), id.to_string(), content.clone()).unwrap();
        assert_eq!(m.post_id, id);
        assert!(parse_ts(&m.ts).is_some());
        assert!(m.bytes > 0);

        let list = list_versions(folder.clone(), id.to_string()).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].ts, m.ts);
    }

    #[test]
    fn read_version_returns_content() {
        let folder = tempdir();
        let pdir = posts_dir(&folder);
        std::fs::create_dir_all(&pdir).unwrap();
        let id = "p1";
        let content = write_post_file(&pdir, id, "Hello", "Body");
        let m = save_version(folder.clone(), id.to_string(), content.clone()).unwrap();
        let v = read_version(folder.clone(), id.to_string(), m.ts.clone()).unwrap();
        assert_eq!(v.content, content);
        assert_eq!(v.title, "Hello");
        assert_eq!(v.updated_at, "2026-06-02T10:00:00.000Z");
    }

    #[test]
    fn list_versions_returns_newest_first() {
        let folder = tempdir();
        let pdir = posts_dir(&folder);
        std::fs::create_dir_all(&pdir).unwrap();
        let id = "p2";
        let c1 = write_post_file(&pdir, id, "T", "v1");
        let m1 = save_version(folder.clone(), id.to_string(), c1).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(5));
        let c2 = write_post_file(&pdir, id, "T", "v2");
        let m2 = save_version(folder.clone(), id.to_string(), c2).unwrap();
        let list = list_versions(folder.clone(), id.to_string()).unwrap();
        assert_eq!(list[0].ts, m2.ts);
        assert_eq!(list[1].ts, m1.ts);
    }

    #[test]
    fn prune_caps_at_max_versions() {
        let folder = tempdir();
        let pdir = posts_dir(&folder);
        std::fs::create_dir_all(&pdir).unwrap();
        let id = "p3";
        let c = write_post_file(&pdir, id, "T", "x");
        for _ in 0..(MAX_VERSIONS_PER_POST + 5) {
            save_version(folder.clone(), id.to_string(), c.clone()).unwrap();
            std::thread::sleep(std::time::Duration::from_millis(2));
        }
        let list = list_versions(folder.clone(), id.to_string()).unwrap();
        assert_eq!(list.len(), MAX_VERSIONS_PER_POST);
    }

    #[test]
    fn delete_versions_for_post_removes_dir() {
        let folder = tempdir();
        let pdir = posts_dir(&folder);
        std::fs::create_dir_all(&pdir).unwrap();
        let id = "p4";
        let c = write_post_file(&pdir, id, "T", "x");
        save_version(folder.clone(), id.to_string(), c).unwrap();
        assert!(post_versions_dir(&pdir, id).exists());
        delete_versions_for_post(folder.clone(), id.to_string()).unwrap();
        assert!(!post_versions_dir(&pdir, id).exists());
    }

    #[test]
    fn invalid_post_id_is_rejected() {
        let folder = tempdir();
        assert!(save_version(folder.clone(), "../etc".into(), "x".into()).is_err());
        assert!(list_versions(folder.clone(), "/etc".into()).is_err());
        assert!(delete_versions_for_post(folder.clone(), "..".into()).is_err());
    }

    #[test]
    fn invalid_ts_is_rejected() {
        let folder = tempdir();
        let pdir = posts_dir(&folder);
        std::fs::create_dir_all(&pdir).unwrap();
        let id = "p5";
        assert!(read_version(folder, id.into(), "../x".into()).is_err());
    }

    struct TempDir {
        path: PathBuf,
    }
    impl TempDir {
        fn new(tag: &str) -> std::io::Result<Self> {
            let mut p = std::env::temp_dir();
            let stamp = Utc::now().timestamp_nanos_opt().unwrap_or(0);
            p.push(format!("lp-versions-{tag}-{stamp}"));
            std::fs::create_dir_all(&p)?;
            Ok(Self { path: p })
        }
    }
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.path);
        }
    }

    fn tempdir() -> PathBuf {
        let dir = TempDir::new("versions-test").unwrap();
        let p = dir.path.clone();
        std::mem::forget(dir);
        p
    }
}
