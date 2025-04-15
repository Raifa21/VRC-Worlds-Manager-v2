use aes::{
    cipher::{BlockDecryptMut, KeyIvInit},
    Aes256,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use cbc::{cipher::block_padding::Pkcs7, Decryptor};
use std::fs;

pub struct EncryptionService;

const ENCRYPTION_KEY: Option<&str> = option_env!("ENCRYPTION_KEY");
const ENCRYPTION_IV: Option<&str> = option_env!("ENCRYPTION_IV");

impl EncryptionService {
    pub fn encrypt(data: String) -> Result<String, String> {
        Ok(data.to_string())
    }

    pub fn decrypt(data: String) -> Result<String, String> {
        Ok(data.to_string())
    }

    fn get_decryption_keys() -> Result<(Vec<u8>, Vec<u8>), String> {
        let key = match ENCRYPTION_KEY {
            Some(key) => key,
            None => {
                return Err(
                    "ENCRYPTION_KEY environment variable not set at compile time".to_string(),
                )
            }
        };

        let iv = match ENCRYPTION_IV {
            Some(iv) => iv,
            None => {
                return Err("ENCRYPTION_IV environment variable not set at compile time".to_string())
            }
        };

        // Convert from base64 to bytes for AES
        let key = STANDARD
            .decode(key)
            .map_err(|e| format!("Failed to decode key: {}", e))?;

        let iv = STANDARD
            .decode(iv)
            .map_err(|e| format!("Failed to decode iv: {}", e))?;

        Ok((key, iv))
    }

    pub fn decrypt_aes(ciphertext: &str) -> Result<String, String> {
        let (key, iv) = Self::get_decryption_keys()?;

        let encrypted = STANDARD
            .decode(ciphertext)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;

        type Aes256CbcDec = Decryptor<Aes256>;

        let cipher = Aes256CbcDec::new(key.as_slice().into(), iv.as_slice().into());

        let mut buffer = vec![0u8; encrypted.len()];
        let decrypted_data = cipher
            .decrypt_padded_b2b_mut::<Pkcs7>(&encrypted, &mut buffer)
            .map_err(|e| format!("Decryption failed: {}", e))?;
        let decrypted_len = decrypted_data.len();

        String::from_utf8(buffer[0..decrypted_len].to_vec())
            .map_err(|e| format!("Invalid UTF-8: {}", e))
    }
}
