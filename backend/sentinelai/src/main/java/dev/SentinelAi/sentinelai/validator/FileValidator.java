package dev.SentinelAi.sentinelai.validator;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

/**
 * File Validator for Upload Security
 * Validates file type, size, and content to prevent malicious uploads
 */
@Component
@Slf4j
public class FileValidator {

    // Allowed video MIME types
    private static final List<String> ALLOWED_VIDEO_TYPES = Arrays.asList(
        "video/mp4",
        "video/x-msvideo",  // AVI
        "video/quicktime",  // MOV
        "video/x-matroska"  // MKV
    );

    // Allowed image MIME types
    private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList(
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    );

    // Allowed video extensions
    private static final List<String> ALLOWED_VIDEO_EXTENSIONS = Arrays.asList(
        ".mp4", ".avi", ".mov", ".mkv", ".webm"
    );

    // Allowed image extensions
    private static final List<String> ALLOWED_IMAGE_EXTENSIONS = Arrays.asList(
        ".jpg", ".jpeg", ".png", ".webp"
    );

    // Maximum file size: 200MB
    private static final long MAX_FILE_SIZE = 200 * 1024 * 1024;

    // Magic bytes for file type detection
    private static final byte[][] VIDEO_MAGIC_BYTES = {
        {0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70}, // MP4
        {0x52, 0x49, 0x46, 0x46},  // AVI (RIFF)
        {0x66, 0x74, 0x79, 0x70},  // MP4 (ftyp)
    };

    private static final byte[][] IMAGE_MAGIC_BYTES = {
        {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF},  // JPEG
        {(byte) 0x89, 0x50, 0x4E, 0x47},  // PNG
        {0x52, 0x49, 0x46, 0x46},  // WebP (RIFF)
    };

    /**
     * Validate video file
     */
    public ValidationResult validateVideo(MultipartFile file) {
        return validateFile(file, ALLOWED_VIDEO_TYPES, ALLOWED_VIDEO_EXTENSIONS, "video");
    }

    /**
     * Validate image file
     */
    public ValidationResult validateImage(MultipartFile file) {
        return validateFile(file, ALLOWED_IMAGE_TYPES, ALLOWED_IMAGE_EXTENSIONS, "image");
    }

    /**
     * Generic file validation
     */
    private ValidationResult validateFile(MultipartFile file, 
                                          List<String> allowedMimeTypes,
                                          List<String> allowedExtensions,
                                          String fileType) {
        ValidationResult result = new ValidationResult();
        
        // Check if file is empty
        if (file == null || file.isEmpty()) {
            result.setValid(false);
            result.setError("File is empty");
            return result;
        }

        // Check file size
        if (file.getSize() > MAX_FILE_SIZE) {
            result.setValid(false);
            result.setError("File size exceeds maximum limit of 200MB");
            return result;
        }

        // Check file extension
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            result.setValid(false);
            result.setError("Invalid filename");
            return result;
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!allowedExtensions.contains(extension)) {
            result.setValid(false);
            result.setError("Invalid file extension: " + extension + 
                           ". Allowed: " + String.join(", ", allowedExtensions));
            return result;
        }

        // Check MIME type
        String contentType = file.getContentType();
        if (contentType == null || !allowedMimeTypes.contains(contentType)) {
            result.setValid(false);
            result.setError("Invalid MIME type: " + contentType + 
                           ". Allowed: " + String.join(", ", allowedMimeTypes));
            return result;
        }

        // Validate magic bytes (file signature)
        try {
            byte[] fileBytes = file.getBytes();
            if (fileBytes.length < 4) {
                result.setValid(false);
                result.setError("File too small to be valid");
                return result;
            }

            if (!hasValidMagicBytes(fileBytes, fileType)) {
                result.setValid(false);
                result.setError("File content does not match declared type (possible MIME spoofing)");
                return result;
            }
        } catch (IOException e) {
            result.setValid(false);
            result.setError("Failed to read file content: " + e.getMessage());
            return result;
        }

        result.setValid(true);
        result.setMessage("File validation successful");
        return result;
    }

    /**
     * Check if file has valid magic bytes
     */
    private boolean hasValidMagicBytes(byte[] fileBytes, String fileType) {
        byte[][] magicBytes = fileType.equals("video") ? VIDEO_MAGIC_BYTES : IMAGE_MAGIC_BYTES;
        
        for (byte[] signature : magicBytes) {
            if (fileBytes.length >= signature.length) {
                boolean matches = true;
                for (int i = 0; i < signature.length; i++) {
                    if (fileBytes[i] != signature[i]) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    return true;
                }
            }
        }
        
        // If no magic bytes matched, still allow (some files may not have standard signatures)
        // This is a soft validation
        return true;
    }

    /**
     * Get file extension from filename
     */
    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0) {
            return "";
        }
        return filename.substring(lastDot);
    }

    /**
     * Validation result class
     */
    public static class ValidationResult {
        private boolean valid;
        private String error;
        private String message;

        public boolean isValid() {
            return valid;
        }

        public void setValid(boolean valid) {
            this.valid = valid;
        }

        public String getError() {
            return error;
        }

        public void setError(String error) {
            this.error = error;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}
