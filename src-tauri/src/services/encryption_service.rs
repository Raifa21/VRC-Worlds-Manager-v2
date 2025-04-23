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

        String::from_utf8(buffer[..decrypted_data_len].to_vec())
            .map_err(|e| format!("Invalid UTF-8: {}", e))
    }
}
