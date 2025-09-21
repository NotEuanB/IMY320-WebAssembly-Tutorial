#include <emscripten.h>
#include <stdlib.h>

// Simple blur filter - averages each pixel with its neighbors
EMSCRIPTEN_KEEPALIVE
void blur_image(unsigned char* input, unsigned char* output, int width, int height, int blur_amount) {    
    for (int y = blur_amount; y < height - blur_amount; y++) {
        for (int x = blur_amount; x < width - blur_amount; x++) {
            for (int channel = 0; channel < 4; channel++) { // RGBA channels
                int sum = 0;
                int count = 0;
                
                // Look at pixels in a square around the current pixel
                for (int dy = -blur_amount; dy <= blur_amount; dy++) {
                    for (int dx = -blur_amount; dx <= blur_amount; dx++) {
                        int pixel_index = ((y + dy) * width + (x + dx)) * 4 + channel;
                        sum += input[pixel_index];
                        count++;
                    }
                }
                
                int output_index = (y * width + x) * 4 + channel;
                output[output_index] = sum / count; // Average all the pixels
            }
        }
    }
}

// Sharpen filter - makes edges more pronounced
EMSCRIPTEN_KEEPALIVE  
void sharpen_image(unsigned char* input, unsigned char* output, int width, int height) {
    for (int y = 1; y < height - 1; y++) {
        for (int x = 1; x < width - 1; x++) {
            for (int channel = 0; channel < 4; channel++) {
                if (channel == 3) { // Skip alpha channel
                    int index = (y * width + x) * 4 + channel;
                    output[index] = input[index];
                    continue;
                }
                
                // Get the current pixel
                int center_index = (y * width + x) * 4 + channel;
                int center_value = input[center_index];
                
                // Calculate average of surrounding pixels
                int sum = 0;
                sum += input[((y-1) * width + (x-1)) * 4 + channel]; // Top-left
                sum += input[((y-1) * width + x) * 4 + channel];     // Top
                sum += input[((y-1) * width + (x+1)) * 4 + channel]; // Top-right
                sum += input[(y * width + (x-1)) * 4 + channel];     // Left
                sum += input[(y * width + (x+1)) * 4 + channel];     // Right
                sum += input[((y+1) * width + (x-1)) * 4 + channel]; // Bottom-left
                sum += input[((y+1) * width + x) * 4 + channel];     // Bottom
                sum += input[((y+1) * width + (x+1)) * 4 + channel]; // Bottom-right
                
                int average = sum / 8;
                
                // Sharpen = original + (original - blurred)
                int sharpened = center_value + (center_value - average);
                
                if (sharpened > 255) sharpened = 255;
                if (sharpened < 0) sharpened = 0;
                
                output[center_index] = sharpened;
            }
        }
    }
}

// Brighten filter - multiply pixel values by a factor
EMSCRIPTEN_KEEPALIVE
void brighten_image(unsigned char* input, unsigned char* output, int width, int height, float brightness) {
    int total_pixels = width * height * 4; // RGBA
    
    for (int i = 0; i < total_pixels; i++) {
        if (i % 4 == 3) {
            // Keep alpha channel unchanged (that's the transparency)
            output[i] = input[i];
        } else {
            // Brighten RGB channels
            int new_value = (int)(input[i] * brightness);
            output[i] = new_value > 255 ? 255 : new_value; // Don't go over 255
        }
    }
}

// Grayscale filter - convert color image to black and white
EMSCRIPTEN_KEEPALIVE
void grayscale_image(unsigned char* input, unsigned char* output, int width, int height) {
    for (int i = 0; i < width * height; i++) {
        int base_index = i * 4;
        
        // Get RGB values
        unsigned char r = input[base_index];     // Red
        unsigned char g = input[base_index + 1]; // Green  
        unsigned char b = input[base_index + 2]; // Blue
        unsigned char a = input[base_index + 3]; // Alpha
        
        // Convert to grayscale using standard formula
        // 0.299*R + 0.587*G + 0.114*B (this is the "luminance" formula)
        unsigned char gray = (unsigned char)(0.299 * r + 0.587 * g + 0.114 * b);
        
        // Set all RGB channels to the same gray value
        output[base_index] = gray;     // Red = gray
        output[base_index + 1] = gray; // Green = gray
        output[base_index + 2] = gray; // Blue = gray
        output[base_index + 3] = a;    // Keep original alpha
    }
}

EMSCRIPTEN_KEEPALIVE
unsigned char* get_memory(int size) {
    return (unsigned char*)malloc(size);
}

EMSCRIPTEN_KEEPALIVE
void release_memory(unsigned char* ptr) {
    free(ptr);
}