import { Component, ElementRef, ViewChild, ViewEncapsulation, NgZone, HostListener, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit {
  title = '';
  greentext = '';
  selectedFileName: string | null = null;
  imageSrc: string | null = null;
  imageName: string | null = null;
  imageSize: string | null = null;
  imageDimensions: string | null = null;
  displayedImageWidth: number | null = null;
  displayedImageHeight: number | null = null;
  currentDate = '';
  postId = '';
  isGenerating = false;
  isDragging = false;
  showFileName = false;

  // Drag counter to handle child elements correctly
  private dragCounter = 0;

  // Gradient Logic
  currentGradientIndex = 0;
  gradients = [
    { name: 'lesbian', value: 'linear-gradient(to right, #ffb591 0%, #ffc9ae 16.6%, #ffe2d1 33.3%, #ffffff 50%, #fcc2d7 66.6%, #f78da7 83.3%, #d1628c 100%)' },
    { name: 'trans', value: 'linear-gradient(to right, #b9eaff, #ffd1dc, #ffffff, #ffd1dc, #b9eaff)' },
    { name: 'mlm', value: 'linear-gradient(to right, #a5ffd6, #c2f9e1, #ffffff, #b5e2ff, #a3a6ff)' },
    { name: 'nonbinary', value: 'linear-gradient(to right, #fff5ba, #ffffff, #e2c6ff, #4f4f4f)' },
    { name: 'bisexual', value: 'linear-gradient(to right, #ffb7ce, #d1b3ff, #b2cefe)' },
    { name: 'pan', value: 'linear-gradient(to right, #ffb3c1, #fff5ba, #bde0fe)' },
    { name: 'aroace', value: 'linear-gradient(to right, #ffb58a, #ffe5b4, #ffffff, #a2d2ff, #6d9dc5)' },
    { name: 'aro', value: 'linear-gradient(to right, #b7e4c7, #d8f3dc, #ffffff, #e2e2e2, #4f4f4f)' },
    { name: 'ace', value: 'linear-gradient(to right, #4a4a4a, #ced4da, #ffffff, #e2bcff)' }
  ];

  private saveTimeout: any;

  @ViewChild('previewContainer') previewContainer!: ElementRef;

  constructor(
    private sanitizer: DomSanitizer,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.updateDate();
    this.postId = Math.floor(Math.random() * 90000000 + 10000000).toString();
  }

  ngOnInit() {
    // Load preferences and data from localStorage
    const savedTitle = localStorage.getItem('post_title');
    if (savedTitle) this.title = savedTitle;

    const savedGreentext = localStorage.getItem('post_greentext');
    if (savedGreentext) this.greentext = savedGreentext;

    const savedShowFileName = localStorage.getItem('show_file_name');
    if (savedShowFileName !== null) {
      this.showFileName = savedShowFileName === 'true';
    }

    const savedGradientIndex = localStorage.getItem('gradient_index');
    if (savedGradientIndex !== null) {
      this.currentGradientIndex = parseInt(savedGradientIndex, 10);
      // Ensure index is valid in case array changed
      if (this.currentGradientIndex >= this.gradients.length || this.currentGradientIndex < 0) {
        this.currentGradientIndex = 0;
      }
    }
  }

  cycleGradient() {
    this.currentGradientIndex = (this.currentGradientIndex + 1) % this.gradients.length;
    localStorage.setItem('gradient_index', String(this.currentGradientIndex));
  }

  get currentGradient() {
    return this.gradients[this.currentGradientIndex].value;
  }

  onInputChange() {
    // Debounce save to localStorage
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      localStorage.setItem('post_title', this.title);
      localStorage.setItem('post_greentext', this.greentext);
    }, 1000);
  }

  onShowFileNameChange() {
    localStorage.setItem('show_file_name', String(this.showFileName));
  }

  updateDate() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[now.getDay()];
    const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    this.currentDate = `${date}(${day})${time}`;
  }

  @HostListener('window:dragenter', ['$event'])
  onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter++;
    this.isDragging = true;
  }

  @HostListener('window:dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Ensure isDragging is true (redundant but safe)
    if (!this.isDragging) this.isDragging = true;
  }

  @HostListener('window:dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter--;

    if (this.dragCounter <= 0) {
      this.isDragging = false;
      this.dragCounter = 0; // Reset to be safe
    }
  }

  @HostListener('window:drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.dragCounter = 0;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        this.processFile(file);
      }
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  processFile(file: File) {
    this.selectedFileName = file.name;
    this.imageName = `${Math.floor(Math.random() * 899999 + 100000)}.${file.name.split('.').pop()}`;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      // Wrap in NgZone.run to ensure change detection happens immediately
      this.ngZone.run(() => {
        this.imageSrc = e.target.result;

        // Force detection after setting src so the img element is rendered
        this.cdr.detectChanges();

        const img = new Image();
        img.onload = () => {
          this.ngZone.run(() => {
            this.imageDimensions = `${img.width}x${img.height}`;
            this.imageSize = `${Math.round(file.size / 1024)} KB`;

            // Resize logic similar to python script
            let width = img.width;
            let height = img.height;

            if (height > 150) {
              width = width * 150 / height;
              height = 150;
            }

            if (width > 250) {
              height = height * 250 / width;
              width = 250;
            }

            this.displayedImageWidth = width;
            this.displayedImageHeight = height;

            // Force detection again after calculating dimensions
            this.cdr.detectChanges();
          });
        };
        img.src = e.target.result;
      });
    };
    reader.readAsDataURL(file);
  }

  get formattedGreentext(): SafeHtml {
    if (!this.greentext) return '';

    const lines = this.greentext.split('\n');
    const formattedLines = lines.map(line => {
      const escapedLine = line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (line.trim().startsWith('>')) {
        return `<span class="quote">${escapedLine}</span>`;
      }
      return escapedLine;
    });

    return this.sanitizer.bypassSecurityTrustHtml(formattedLines.join('<br>'));
  }

  async generateImages() {
    if (!this.previewContainer) return;
    this.isGenerating = true;

    try {
      const canvas = await html2canvas(this.previewContainer.nativeElement, {
        scale: 1, // Adjust scale if needed for better quality
        useCORS: true,
        backgroundColor: '#ffe' // Match body background
      });

      const images = this.splitImage(canvas);

      if (images.length === 1) {
        // If only one image, download it directly
        const base64Data = images[0].split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'image/png'});
        saveAs(blob, 'image.png');
      } else {
        // If multiple images, zip them
        const zip = new JSZip();
        images.forEach((imgData, index) => {
          const base64Data = imgData.split(',')[1];
          zip.file(`image${index}.png`, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'images.zip');
      }

    } catch (error) {
      console.error('Error generating images:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  splitImage(canvas: HTMLCanvasElement): string[] {
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const width = canvas.width;
    const height = canvas.height;
    const images: string[] = [];

    let completedHeight = 0;

    while (completedHeight < height) {
      let heightOfScreenshot = 1280;

      if (height - completedHeight <= 1280) {
        heightOfScreenshot = height - completedHeight;

        const chunk = this.createChunk(canvas, completedHeight, heightOfScreenshot, width);
        if (chunk) images.push(chunk);

        completedHeight += heightOfScreenshot;

      } else {
        let foundCutLine = false;
        let currentY = completedHeight + heightOfScreenshot;

        while (!foundCutLine && currentY < height) {
          const imageData = ctx.getImageData(0, currentY, width, 1).data;
          let isSafeToCut = true;

          for (let x = 0; x < width; x++) {
            const r = imageData[x * 4];
            if (r < 251) {
              isSafeToCut = false;
              break;
            }
          }

          if (isSafeToCut) {
            foundCutLine = true;
            heightOfScreenshot = currentY - completedHeight;
          } else {
            currentY++;
          }
        }

        const chunk = this.createChunk(canvas, completedHeight, heightOfScreenshot, width);
        if (chunk) images.push(chunk);

        completedHeight += heightOfScreenshot;
      }
    }

    return images;
  }

  private createChunk(sourceCanvas: HTMLCanvasElement, startY: number, height: number, width: number): string | null {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = width;
    newCanvas.height = height;
    const newCtx = newCanvas.getContext('2d');

    if (newCtx) {
      newCtx.drawImage(sourceCanvas, 0, startY, width, height, 0, 0, width, height);
      return newCanvas.toDataURL('image/png');
    }
    return null;
  }
}
