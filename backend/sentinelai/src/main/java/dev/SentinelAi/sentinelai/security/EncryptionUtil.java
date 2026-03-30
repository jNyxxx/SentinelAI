package dev.SentinelAi.sentinelai.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES Encryption Utility
 * Encrypts and decrypts files using AES-256-GCM
 */
@Component
@Slf4j
public class EncryptionUtil {

    private static final String AES_ALGORITHM = "AES";
    private static final String AES_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 96 bits
    private static final int GCM_TAG_LENGTH = 128; // 128 bits

    @Value("${encryption.secret:SentinelAIEncryptionSecretKey2026!}")
    private String encryptionSecret;

    private SecretKey getSecretKey() {
        // Derive a 256-bit key from the secret string
        byte[] secretBytes = encryptionSecret.getBytes(StandardCharsets.UTF_8);
        
        // Pad or truncate to 32 bytes (256 bits)
        byte[] keyBytes = new byte[32];
        System.arraycopy(secretBytes, 0, keyBytes, 0, Math.min(secretBytes.length, keyBytes.length));
        
        return new SecretKeySpec(keyBytes, AES_ALGORITHM);
    }

    /**
     * Encrypt data using AES-256-GCM
     * Returns base64 encoded string with IV prepended
     */
    public String encrypt(byte[] data) throws Exception {
        Cipher cipher = Cipher.getInstance(AES_TRANSFORMATION);
        
        // Generate random IV
        byte[] iv = new byte[GCM_IV_LENGTH];
        SecureRandom secureRandom = new SecureRandom();
        secureRandom.nextBytes(iv);
        
        // Initialize cipher with IV
        GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.ENCRYPT_MODE, getSecretKey(), parameterSpec);
        
        // Encrypt data
        byte[] encryptedData = cipher.doFinal(data);
        
        // Prepend IV to encrypted data
        ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + encryptedData.length);
        byteBuffer.put(iv);
        byteBuffer.put(encryptedData);
        
        // Return base64 encoded result
        return Base64.getEncoder().encodeToString(byteBuffer.array());
    }

    /**
     * Decrypt data using AES-256-GCM
     * Expects base64 encoded string with IV prepended
     */
    public byte[] decrypt(String encryptedDataBase64) throws Exception {
        // Decode base64
        byte[] encryptedData = Base64.getDecoder().decode(encryptedDataBase64);
        
        // Extract IV and encrypted data
        ByteBuffer byteBuffer = ByteBuffer.wrap(encryptedData);
        byte[] iv = new byte[GCM_IV_LENGTH];
        byteBuffer.get(iv);
        
        byte[] cipherText = new byte[byteBuffer.remaining()];
        byteBuffer.get(cipherText);
        
        // Initialize cipher for decryption
        Cipher cipher = Cipher.getInstance(AES_TRANSFORMATION);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), parameterSpec);
        
        // Decrypt data
        return cipher.doFinal(cipherText);
    }

    /**
     * Generate a new random encryption key (for initial setup)
     */
    public static String generateSecretKey() {
        try {
            KeyGenerator keyGen = KeyGenerator.getInstance(AES_ALGORITHM);
            keyGen.init(256);
            SecretKey secretKey = keyGen.generateKey();
            return Base64.getEncoder().encodeToString(secretKey.getEncoded());
        } catch (Exception e) {
            log.error("Failed to generate secret key", e);
            return null;
        }
    }
}
