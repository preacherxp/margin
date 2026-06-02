use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::command;

use super::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PostStatus {
    Draft,
    Scheduled,
    Published,
    Archived,
}

impl Default for PostStatus {
    fn default() -> Self {
        Self::Draft
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PostType {
    Linkedin,
    Blog,
}

impl Default for PostType {
    fn default() -> Self {
        Self::Linkedin
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LinkedinMeta {
    #[serde(default)]
    pub hook: String,
    #[serde(default)]
    pub cta: String,
    #[serde(default)]
    pub hashtags: Vec<String>,
    #[serde(default)]
    pub audience: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostMeta {
    pub id: String,
    pub title: String,
    pub status: PostStatus,
    #[serde(rename = "type")]
    pub post_type: PostType,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub scheduled_for: Option<DateTime<Utc>>,
    pub published_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub template: Option<String>,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Post {
    #[serde(flatten)]
    pub meta: PostMeta,
    #[serde(default)]
    pub linkedin: LinkedinMeta,
    #[serde(default)]
    pub assets: Vec<String>,
    #[serde(default)]
    pub versions: u32,
    #[serde(default)]
    pub body: String,
}

const POSTS_DIR: &str = "posts";
const FRONTMATTER_DELIM: &str = "---";

pub fn posts_dir(folder: &Path) -> PathBuf {
    if folder.file_name().and_then(|n| n.to_str()) == Some(POSTS_DIR) {
        return folder.to_path_buf();
    }
    folder.join(POSTS_DIR)
}

pub fn parse_frontmatter(content: &str) -> AppResult<(serde_yaml::Value, String)> {
    let trimmed = content.trim_start_matches('\u{feff}');
    if !trimmed.starts_with(FRONTMATTER_DELIM) {
        return Err(AppError::Invalid("missing frontmatter delimiter".into()));
    }
    let rest = &trimmed[FRONTMATTER_DELIM.len()..];
    let rest = rest.trim_start_matches(|c: char| c == '\n' || c == '\r');
    let end = rest
        .find(&format!("\n{FRONTMATTER_DELIM}"))
        .ok_or_else(|| AppError::Invalid("unterminated frontmatter".into()))?;
    let yaml_str = &rest[..end];
    let body_start = end + 1 + FRONTMATTER_DELIM.len();
    let body = rest[body_start..].trim_start_matches('\n').to_string();
    let value: serde_yaml::Value = serde_yaml::from_str(yaml_str)?;
    Ok((value, body))
}

fn post_from_content(path: &Path, content: &str) -> AppResult<Post> {
    let (value, body) = parse_frontmatter(content)?;
    let mut post: Post = serde_yaml::from_value(value).map_err(AppError::Yaml)?;
    post.body = body;
    post.meta.path = path.to_string_lossy().to_string();
    if post.meta.id.is_empty() {
        return Err(AppError::Invalid("post missing id".into()));
    }
    Ok(post)
}

#[command]
pub fn list_posts(folder: PathBuf) -> AppResult<Vec<PostMeta>> {
    let dir = posts_dir(&folder);
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        if name.starts_with('.') {
            continue;
        }
        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("list_posts: read failed for {}: {}", path.display(), e);
                continue;
            }
        };
        match post_from_content(&path, &content) {
            Ok(post) => out.push(post.meta),
            Err(e) => eprintln!(
                "list_posts: parse failed for {}: {}",
                path.display(),
                e
            ),
        }
    }
    out.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(out)
}

#[command]
pub fn read_post(path: PathBuf) -> AppResult<Post> {
    let content = std::fs::read_to_string(&path)?;
    post_from_content(&path, &content)
}

#[command]
pub fn write_post(path: PathBuf, content: String) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&path, content)?;
    Ok(())
}

#[command]
pub fn delete_post(path: PathBuf) -> AppResult<()> {
    if !path.exists() {
        return Err(AppError::NotFound(path.to_string_lossy().to_string()));
    }
    std::fs::remove_file(&path)?;
    Ok(())
}

#[command]
pub fn ensure_posts_dir(folder: PathBuf) -> AppResult<PathBuf> {
    let dir = posts_dir(&folder);
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn post_from_content_reads_body_outside_frontmatter() {
        let content = r#"---
id: 01KT3VK9P7CCMT85JCXGMEQPV4
title: Test
status: draft
type: linkedin
createdAt: 2026-06-02T09:45:51.559Z
updatedAt: 2026-06-02T09:45:51.559Z
scheduledFor: null
publishedAt: null
tags: []
template: null
path: /Users/prchr/Desktop/poster/posts/2026-06-02-test.md
linkedin:
  hook: ""
  cta: ""
  hashtags: []
  audience: ""
assets: []
versions: 0
---
Markdown body
"#;

        let post = post_from_content(
            Path::new("/Users/prchr/Desktop/poster/posts/2026-06-02-test.md"),
            content,
        )
        .expect("frontmatter without body field should parse");

        assert_eq!(post.meta.id, "01KT3VK9P7CCMT85JCXGMEQPV4");
        assert_eq!(post.body, "Markdown body\n");
    }

    #[test]
    fn posts_dir_does_not_append_posts_twice() {
        assert_eq!(
            posts_dir(Path::new("/Users/prchr/Documents/margin/posts")),
            PathBuf::from("/Users/prchr/Documents/margin/posts")
        );
        assert_eq!(
            posts_dir(Path::new("/Users/prchr/Documents/margin")),
            PathBuf::from("/Users/prchr/Documents/margin/posts")
        );
    }
}
