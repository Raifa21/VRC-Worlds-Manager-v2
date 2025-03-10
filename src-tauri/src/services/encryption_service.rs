//TODO: implement a encryption/decryption service using a individual key for each user
//for now, return the same string
pub struct EncryptionService;

impl EncryptionService {
    pub fn encrypt(data: String) -> Result<String, String> {
        Ok(data.to_string())
    }

    pub fn decrypt(data: String) -> Result<String, String> {
        Ok(data.to_string())
    }

    pub fn decrypt_old_AES(data: String) -> Result<String, String> {
        Ok(data.to_string())
    }
}
