use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::command;

use super::error::{AppError, AppResult};
use super::posts::{parse_frontmatter, PostType};

#[derive(Debug, Clone, Serialize, Deserialize)]
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

impl Default for LinkedinMeta {
    fn default() -> Self {
        Self {
            hook: String::new(),
            cta: String::new(),
            hashtags: Vec::new(),
            audience: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateMeta {
    #[serde(default)]
    pub slug: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(rename = "type")]
    pub post_type: PostType,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(alias = "isTemplate", default)]
    pub is_built_in: bool,
    #[serde(default)]
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Template {
    #[serde(flatten)]
    pub meta: TemplateMeta,
    #[serde(default)]
    pub linkedin: LinkedinMeta,
    #[serde(default)]
    pub body: String,
}

const TEMPLATES_DIR: &str = "templates";

fn templates_dir(folder: &Path) -> PathBuf {
    if folder.file_name().and_then(|n| n.to_str()) == Some(TEMPLATES_DIR) {
        return folder.to_path_buf();
    }
    folder.join(TEMPLATES_DIR)
}

fn slug_from_path(path: &Path) -> Option<String> {
    path.file_stem().and_then(|s| s.to_str()).map(|s| s.to_string())
}

fn template_from_content(path: &Path, content: &str) -> AppResult<Template> {
    let (value, body) = parse_frontmatter(content)?;
    let mut tpl: Template = serde_yaml::from_value(value).map_err(AppError::Yaml)?;
    tpl.body = body;
    let path_str = path.to_string_lossy().to_string();
    if tpl.meta.slug.is_empty() {
        tpl.meta.slug = slug_from_path(path).unwrap_or_default();
    }
    tpl.meta.path = Some(path_str);
    tpl.meta.is_built_in = false;
    if tpl.meta.slug.is_empty() {
        return Err(AppError::Invalid("template missing slug".into()));
    }
    Ok(tpl)
}

#[command]
pub fn list_templates(folder: PathBuf) -> AppResult<Vec<TemplateMeta>> {
    let dir = templates_dir(&folder);
    if !dir.exists() {
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
                eprintln!("list_templates: read failed for {}: {}", path.display(), e);
                continue;
            }
        };
        match template_from_content(&path, &content) {
            Ok(t) => out.push(t.meta),
            Err(e) => eprintln!(
                "list_templates: parse failed for {}: {}",
                path.display(),
                e
            ),
        }
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

#[command]
pub fn read_template(path: PathBuf) -> AppResult<Template> {
    let content = std::fs::read_to_string(&path)?;
    template_from_content(&path, &content)
}

#[command]
pub fn write_template(path: PathBuf, content: String) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&path, content)?;
    Ok(())
}

#[command]
pub fn delete_template(path: PathBuf) -> AppResult<()> {
    if !path.exists() {
        return Err(AppError::NotFound(path.to_string_lossy().to_string()));
    }
    std::fs::remove_file(&path)?;
    Ok(())
}

#[command]
pub fn ensure_templates_dir(folder: PathBuf) -> AppResult<PathBuf> {
    let dir = templates_dir(&folder);
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn templates_dir_does_not_append_twice() {
        assert_eq!(
            templates_dir(Path::new("/Users/prchr/Documents/margin/templates")),
            PathBuf::from("/Users/prchr/Documents/margin/templates")
        );
        assert_eq!(
            templates_dir(Path::new("/Users/prchr/Documents/margin")),
            PathBuf::from("/Users/prchr/Documents/margin/templates")
        );
    }

    #[test]
    fn template_from_content_reads_body_outside_frontmatter() {
        let content = r#"---
slug: blog-how-to
name: Blog How-To
description: Step-by-step
type: blog
tags: []
isTemplate: true
linkedin:
  hook: ""
  cta: ""
  hashtags: []
  audience: ""
---
# Body
Some body text.
"#;
        let tpl = template_from_content(
            Path::new("/Users/prchr/Documents/margin/templates/blog-how-to.md"),
            content,
        )
        .expect("template should parse");
        assert_eq!(tpl.meta.slug, "blog-how-to");
        assert_eq!(tpl.meta.name, "Blog How-To");
        assert_eq!(tpl.meta.path.as_deref(), Some(
            "/Users/prchr/Documents/margin/templates/blog-how-to.md"
        ));
        assert_eq!(tpl.body, "# Body\nSome body text.\n");
    }

    #[test]
    fn template_slug_falls_back_to_filename() {
        let content = r#"---
name: Anonymous
type: linkedin
isTemplate: true
linkedin:
  hook: ""
  cta: ""
  hashtags: []
  audience: ""
---
body
"#;
        let tpl = template_from_content(
            Path::new("/tmp/anon-template.md"),
            content,
        )
        .expect("template should parse");
        assert_eq!(tpl.meta.slug, "anon-template");
    }
}
