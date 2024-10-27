import { Injectable, isDevMode } from '@angular/core';
import { GCPsDescriptor, TxtDescriptor, GCP, ImageGcp, Projection, ElevationMeasureUnit } from './gcps-utils.service';
import { base64ArrayBuffer } from 'src/shared/utils';
import { validate, LicenseInfo, DemoLicense, DevLicense } from './licenser';
import exifr from 'exifr';
import { GPSCoords } from '../shared/common';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    public gcps: GCP[];
    public imageGcps: ImageGcp[] = [];
    public projection: Projection;
    public images: ImageInfo[] = [];
    public license: LicenseInfo;

    public saveImage(image: ImageInfo): ImageInfo {
        const match = this.images.filter(item => item.name === image.name);
        if (match.length === 0) {
            this.images.push(image);
        } else {
            match[0].url = image.url;
        }
        return image;
    }

    public removeImage(imageName: string): void {
        const match = this.images.find(item => item.name === imageName);
        if (match) {
            this.images.splice(this.images.indexOf(match), 1);
        }

        this.imageGcps = this.imageGcps.filter(item => item.imgName !== imageName);
    }

    public saveImageRaw(f: File, imageUrl: string): ImageInfo {
        const image: ImageInfo = new ImageInfo(f, imageUrl);
        return this.saveImage(image);
    }

    public getImageUrl(name: string): string {
        const match = this.images.filter(item => item.name === name);

        if (match.length === 0) {
            return null;
        } else {
            return match[0].url;
        }
    }

    public hasLicense(): boolean {
        return (!!localStorage.getItem("license") && !this.getLicense().demo) || this.getLicense().dev;
    }

    public getLicense(): LicenseInfo {
    return new DevLicense();
}

    public saveLicense(license: string) {
        if (!validate('gcpeditorpro', license).demo) {
            this.license = null;
            localStorage.setItem("license", license);
        }
    }

    constructor() { }
}

class ImageInfo {

    constructor(file: File, url: string) {
        this.name = file.name;
        this.url = url;
        this._file = file;
    }

    public name: string;
    public url: string | null;
    private _coords: GPSCoords;
    private _file: File;

    public getCoords() : Promise<GPSCoords> {

        if (this._coords)
            return Promise.resolve(this._coords);
        
        const prom = new Promise<GPSCoords>(async (resolve, reject) => {
            try{
                let {latitude, longitude } = await exifr.gps(this.url);
                this._coords = {
                    lat: latitude,
                    lng: longitude,
                    alt: 0
                }; 
                resolve(this._coords);
            }catch(e){
                resolve(null);
            }
        });

        return prom;
        
    }
}


