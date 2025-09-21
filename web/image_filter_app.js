class ImageFilterDemo {
    constructor() {
        this.canvas = document.getElementById('image-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.originalImageData = null;
        this.module = null;
        
        this.setupEventListeners();
        this.updateStatus('Upload an image to start!');
    }
    
    setupEventListeners() {
        const uploadInput = document.getElementById('image-upload');
        uploadInput.addEventListener('change', (e) => this.handleImageUpload(e));
        
        document.getElementById('original-btn').addEventListener('click', () => this.showOriginal());
        document.getElementById('blur-btn').addEventListener('click', () => this.applyBlur());
        document.getElementById('sharpen-btn').addEventListener('click', () => this.applySharpen());
        document.getElementById('brighten-btn').addEventListener('click', () => this.applyBrighten());
        document.getElementById('grayscale-btn').addEventListener('click', () => this.applyGrayscale());
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const img = new Image();
        img.onload = () => {
            // Set canvas size to match image
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            
            // Draw original image
            this.ctx.drawImage(img, 0, 0);
            
            // Store original image data
            this.originalImageData = this.ctx.getImageData(0, 0, img.width, img.height);
            
            this.updateStatus('Image loaded! Try the filter buttons.');
            console.log('Image loaded:', img.width, 'x', img.height);
        };
        
        img.src = URL.createObjectURL(file);
    }
    
    showOriginal() {
        if (!this.originalImageData) {
            console.log('No original image to show');
            return;
        }
        
        this.ctx.putImageData(this.originalImageData, 0, 0);
        this.updateStatus('Showing original image');
    }
    
    applyBlur() {
        this.applyFilter('blur', [3]); // blur amount = 3
    }
    
    applySharpen() {
        this.applyFilter('sharpen', []);
    }
    
    applyBrighten() {
        this.applyFilter('brighten', [1.5]); // brightness factor = 1.5
    }
    
    applyGrayscale() {
        this.applyFilter('grayscale', []);
    }
    
    applyFilter(filterType, params = []) {
        if (!this.originalImageData) {
            console.log('No image loaded');
            return;
        }

        if (!this.module) {
            console.error('WebAssembly module not loaded yet!');
            return;
        }

        
        const startTime = performance.now();
        
        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        const imageSize = width * height * 4; // RGBA
        
        try {
            // Allocate memory in WebAssembly
            const inputPtr = this.module._malloc(imageSize);
            const outputPtr = this.module._malloc(imageSize);
            
            if (!inputPtr || !outputPtr) {
                console.error('Failed to allocate memory');
                return;
            }
            
            // Copy image data to WebAssembly memory using setValue
            for (let i = 0; i < this.originalImageData.data.length; i++) {
                this.module.setValue(inputPtr + i, this.originalImageData.data[i], 'i8');
            }

            
            // Apply the filter
            switch (filterType) {
                case 'blur':
                    this.module._blur_image(inputPtr, outputPtr, width, height, params[0] || 3);
                    break;
                case 'sharpen':
                    this.module._sharpen_image(inputPtr, outputPtr, width, height);
                    break;
                case 'brighten':
                    this.module._brighten_image(inputPtr, outputPtr, width, height, params[0] || 1.5);
                    break;
                case 'grayscale':
                    this.module._grayscale_image(inputPtr, outputPtr, width, height);
                    break;
                default:
                    console.error('Unknown filter type:', filterType);
                    return;
            }
            
            
            const outputData = new Uint8ClampedArray(imageSize);
            for (let i = 0; i < imageSize; i++) {
                let value = this.module.getValue(outputPtr + i, 'i8');
                if (value < 0) value = value + 256;
                outputData[i] = value;
            }
            
            console.log('Creating new ImageData...');
            console.log('First few output values:', outputData.slice(0, 16));
            
            const newImageData = new ImageData(outputData, width, height);
            
            this.ctx.putImageData(newImageData, 0, 0);
            
            this.module._free(inputPtr);
            this.module._free(outputPtr);
            
            const endTime = performance.now();
            const processingTime = (endTime - startTime).toFixed(2);
            
            console.log(`${filterType} filter applied in ${processingTime}ms`);
            if (document.getElementById('wasm-time')) {
                document.getElementById('wasm-time').textContent = processingTime + 'ms';
            }
            
        } catch (error) {
            console.error('Error applying filter:', error);
            console.log('Available methods:', Object.keys(this.module).filter(k => !k.startsWith('asm')));
        }
    }
    
    updateStatus(message) {
        console.log('Status:', message);
    }
}
