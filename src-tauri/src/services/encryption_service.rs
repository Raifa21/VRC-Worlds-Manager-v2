use aes::{
    cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit},
    Aes256,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use cbc::{cipher::block_padding::Pkcs7, Decryptor};
use std::fs;

pub struct EncryptionService;

const ENCRYPTION_KEY: Option<&str> = option_env!("ENCRYPTION_KEY");
const ENCRYPTION_IV: Option<&str> = option_env!("ENCRYPTION_IV");

impl EncryptionService {
    fn get_encryption_keys() -> Result<(Vec<u8>, Vec<u8>), String> {
        let key = ENCRYPTION_KEY.ok_or_else(|| {
            "ENCRYPTION_KEY environment variable not set at compile time".to_string()
        })?;

        let iv = ENCRYPTION_IV.ok_or_else(|| {
            "ENCRYPTION_IV environment variable not set at compile time".to_string()
        })?;

        // Convert from base64 to bytes for AES
        let key = STANDARD
            .decode(key)
            .map_err(|e| format!("Failed to decode key: {}", e))?;

        let iv = STANDARD
            .decode(iv)
            .map_err(|e| format!("Failed to decode iv: {}", e))?;

        // Validate key and IV sizes
        if key.len() != 32 {
            return Err(format!(
                "Invalid key length: {}. Expected 32 bytes",
                key.len()
            ));
        }
        if iv.len() != 16 {
            return Err(format!(
                "Invalid IV length: {}. Expected 16 bytes",
                iv.len()
            ));
        }

        Ok((key, iv))
    }

    pub fn encrypt_aes(plaintext: &str) -> Result<String, String> {
        let (key, iv) = Self::get_encryption_keys()?;

        type Aes256CbcEnc = cbc::Encryptor<Aes256>;
        let cipher = Aes256CbcEnc::new(key.as_slice().into(), iv.as_slice().into());

        let mut buffer = vec![0u8; plaintext.len() + 16];
        let encrypted_data_len = cipher
            .encrypt_padded_b2b_mut::<Pkcs7>(plaintext.as_bytes(), &mut buffer)
            .map_err(|e| format!("Encryption failed: {}", e))?
            .len();

        let encrypted_slice = &buffer[..encrypted_data_len];
        Ok(STANDARD.encode(encrypted_slice))
    }

    pub fn decrypt_aes(ciphertext: &str) -> Result<String, String> {
        let (key, iv) = Self::get_encryption_keys()?;

        let encrypted = STANDARD
            .decode(ciphertext)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;

        type Aes256CbcDec = Decryptor<Aes256>;
        let cipher = Aes256CbcDec::new(key.as_slice().into(), iv.as_slice().into());

        let mut buffer = vec![0u8; encrypted.len()];
        let decrypted_data_len = cipher
            .decrypt_padded_b2b_mut::<Pkcs7>(&encrypted, &mut buffer)
            .map_err(|e| format!("Decryption failed: {}", e))?
            .len();

        // Convert decrypted bytes to a UTF-8 string
        let decrypted_str = String::from_utf8(buffer[..decrypted_data_len].to_vec())
            .map_err(|e| format!("Invalid UTF-8: {}", e))?;
        // Return the decrypted string
        Ok(decrypted_str)
    }
}

#[cfg(test)]
mod tests {
    // use "decrypted.json" and encrypt, then write to "encrypted.json"
    use super::*;
    use serde_json::Value;
    use std::fs::File;
    use std::io::{BufReader, Read};
    use std::path::Path;

    #[test]
    fn test_encryption_decryption() {
        // Read the JSON file
        let path = Path::new("decrypted.json");
        let file = File::open(path).expect("Failed to open the file");
        let mut reader = BufReader::new(file);
        let mut json_data = String::new();
        reader
            .read_to_string(&mut json_data)
            .expect("Failed to read the file");
        // Encrypt the JSON data
        let encrypted_data =
            EncryptionService::encrypt_aes(&json_data).expect("Failed to encrypt the data");
        // Write the encrypted data to a file
        fs::write("encrypted.json", &encrypted_data)
            .expect("Failed to write encrypted data to file");
        // Decrypt the data
        let decrypted_data =
            EncryptionService::decrypt_aes(&encrypted_data).expect("Failed to decrypt the data");
        // Parse the decrypted data to ensure it's valid JSON
        let parsed_data: Value =
            serde_json::from_str(&decrypted_data).expect("Failed to parse decrypted data as JSON");
        // Check if the parsed data is equal to the original JSON data
        let original_data: Value =
            serde_json::from_str(&json_data).expect("Failed to parse original data as JSON");
        assert_eq!(original_data, parsed_data);
    }

    #[test]
    fn test_decryption() {
        // Read the encrypted JSON file
        let path = Path::new("encrypted.json");
        let file = File::open(path).expect("Failed to open the file");
        let mut reader = BufReader::new(file);
        let mut encrypted_data = String::new();
        reader
            .read_to_string(&mut encrypted_data)
            .expect("Failed to read the file");
        // Decrypt the data
        let decrypted_data =
            EncryptionService::decrypt_aes(&encrypted_data).expect("Failed to decrypt the data");
        // write the decrypted data to a file
        fs::write("decrypted.json", &decrypted_data)
            .expect("Failed to write decrypted data to file");
    }
}
