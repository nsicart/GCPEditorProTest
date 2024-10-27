import { AfterViewInit, Inject, Injectable, OnInit, Renderer2, RendererFactory2 } from '@angular/core';
import { CoordsXY } from '../shared/common';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { tap, switchMap, filter } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { DOCUMENT } from '@angular/common';

declare var cv: any;

@Injectable({
    providedIn: 'root'
})
export class GcpsDetectorService {

    private r2: Renderer2;
    private areClassifiersLoaded: boolean;
    
    // ** Defineix aquí els fitxers XML de classificadors OpenCV **
    private classifiers = [
        "gcp-square-base.xml",  
        "gcp-bw-quads.xml"
    ];

    constructor(
        private storage: StorageService,
        rendererFactory: RendererFactory2,
        @Inject(DOCUMENT) private document: Document,
    ) {
        this.r2 = rendererFactory.createRenderer(null, null);
    }

    async loadClassifiers(): Promise<void> {
        // Aquest mètode es pot ometre si els XML estan en una ubicació local coneguda
        this.areClassifiersLoaded = true;
    }

    async detect(imgName: string): Promise<CoordsXY> {

        if (!this.areClassifiersLoaded) {
            await this.loadClassifiers();
            this.areClassifiersLoaded = true;
        }

        return new Promise<CoordsXY>((resolve, reject) => {
            const url = this.storage.getImageUrl(imgName);
            const container = this.createHiddenContainer();

            const imgTag = this.r2.createElement('img');
            this.r2.setAttribute(imgTag, 'src', url);
            this.r2.appendChild(container, imgTag);

            imgTag.onload = () => {
                try {
                    const img = cv.imread(imgTag);
                    const scale = 1.05;
                    const neighbors = 3;
                    const minSize = new cv.Size(30, 30);
                    const maxSize = new cv.Size(0, 0);
                    let res: CoordsXY = null;

                    for (const classifierName of this.classifiers) {
                        const classifier = new cv.CascadeClassifier();
                        classifier.load(`assets/opencv/data/haarcascades/${classifierName}`);
                        const rects = new cv.RectVector();

                        classifier.detectMultiScale(img, rects, scale, neighbors, 0, minSize, maxSize);

                        if (rects.size() > 0) {
                            const rect = rects.get(0);
                            res = { x: rect.x + (rect.width / 2), y: rect.y + (rect.height / 2) };
                            rects.delete();
                            classifier.delete();
                            break;
                        }
                        rects.delete();
                        classifier.delete();
                    }

                    this.r2.removeChild(this.document.body, container);
                    img.delete();

                    resolve(res);

                } catch (e) {
                    reject(e);
                }
            };
        });
    }

    private createHiddenContainer(): HTMLElement {
        const container = this.r2.createElement('div');
        this.r2.setStyle(container, 'position', 'absolute');
        this.r2.setStyle(container, 'top', '0');
        this.r2.setStyle(container, 'left', '0');
        this.r2.setStyle(container, 'width', '100%');
        this.r2.setStyle(container, 'height', '100%');
        this.r2.setStyle(container, 'opacity', '0');
        this.r2.setStyle(container, 'overflow', 'hidden');
        this.r2.setStyle(container, 'z-index', '-1');
        this.r2.appendChild(this.document.body, container);
        return container;
    }
}
