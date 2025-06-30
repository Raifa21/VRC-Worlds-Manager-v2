use std::{
    collections::HashMap,
    fs::File,
    io::{BufReader, BufWriter},
    path::PathBuf,
};

pub struct MemoManager {
    path: PathBuf,
    memo: HashMap<String, String>,
}

impl MemoManager {
    pub fn load(path: PathBuf) -> Result<Self, String> {
        if !path.exists() {
            return Ok(Self {
                path,
                memo: HashMap::new(),
            });
        }

        let file = File::open(&path).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);
        let memo: HashMap<String, String> =
            serde_json::from_reader(reader).map_err(|e| e.to_string())?;

        Ok(Self { path, memo })
    }

    pub fn save(&self) -> Result<(), String> {
        let file = File::create(&self.path).map_err(|e| e.to_string())?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, &self.memo).map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn get_memo(&self, world_id: &str) -> Option<&str> {
        self.memo.get(world_id).map(|s| s.as_str())
    }

    pub fn set_memo(&mut self, world_id: &str, memo: &str) {
        self.memo.insert(world_id.to_string(), memo.to_string());
    }
}
