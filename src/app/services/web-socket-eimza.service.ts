import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

// WebSocket mesaj yapıları
export interface EimzaMessage {
  data: string;
  kullaniciId: string;
  received: string;
  islemId: string;
  sertifikaId: string;
  hataMesaji?: string;
  akilliKartIsim?: string;
}

export interface EimzaResponse {
  success: boolean;
  data?: string;
  error?: string;
  islemId: string;
  raw?: EimzaMessage;
}

export interface Certificate {
  SerialNumber: string;
  IssuerCommonName: string;
  SubjectCommonName: string;
  ValidFrom: string;
  ValidTo: string;
  Thumbprint?: string;
}

export interface Terminal {
  Name: string;
  IsCardPresent: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketEimzaService {

  // WebSocket bağlantı ayarları
  private webSocket: WebSocket;
  private wsAddress = '127.0.0.1';
  private wsPort = '5000';
  private wsUri = '';
  private kullaniciId = 'user_' + Date.now();
  
  // Seçili kart kütüphanesi
  private selectedDll = 'akisp11.dll'; // Turktrust, Tubitak
  
  // Bağlantı durumu
  private connectionSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionSubject.asObservable();
  
  // Mesaj yönetimi
  private messageSubject = new Subject<EimzaResponse>();
  public message$ = this.messageSubject.asObservable();
  
  // Sertifika listesi
  private certificatesSubject = new BehaviorSubject<Certificate[]>([]);
  public certificates$ = this.certificatesSubject.asObservable();
  
  // Terminal listesi
  private terminalsSubject = new BehaviorSubject<Terminal[]>([]);
  public terminals$ = this.terminalsSubject.asObservable();

  constructor() {
    this.initializeWebSocket();
  }

  /**
   * WebSocket bağlantısını başlatır
   */
  private initializeWebSocket(): void {
    try {
      const path = `ws://${this.wsAddress}:${this.wsPort}/ws/${this.wsUri}`;
      this.webSocket = new WebSocket(path, 'sec-websocket-protocol');
      
      this.webSocket.onopen = () => {
        console.log('WebSocket bağlantısı başarılı');
        this.connectionSubject.next(true);
      };
      
      this.webSocket.onmessage = (event) => {
        this.handleMessage(event);
      };
      
      this.webSocket.onerror = (error) => {
        console.error('WebSocket hatası:', error);
        this.connectionSubject.next(false);
      };
      
      this.webSocket.onclose = () => {
        console.log('WebSocket bağlantısı kapandı');
        this.connectionSubject.next(false);
        
        // 5 saniye sonra yeniden bağlan
        setTimeout(() => {
          this.initializeWebSocket();
        }, 5000);
      };
      
    } catch (error) {
      console.error('WebSocket başlatma hatası:', error);
      this.connectionSubject.next(false);
    }
  }

  /**
   * Gelen mesajları işler
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const response: EimzaMessage = JSON.parse(event.data);
      
      const result: EimzaResponse = {
        success: !response.hataMesaji,
        data: response.data,
        error: response.hataMesaji,
        islemId: response.islemId,
        raw: response
      };
      
      // Özel işlemler
      switch (response.islemId) {
        case '2': // Terminal listesi
          this.parseTerminals(response.data);
          break;
        case '3': // Sertifika listesi
          this.parseCertificates(response.data);
          break;
      }
      
      this.messageSubject.next(result);
    } catch (error) {
      console.error('Mesaj parse hatası:', error);
    }
  }

  /**
   * Terminal listesini parse eder
   */
  private parseTerminals(data: string): void {
    try {
      if (data && data.trim()) {
        const terminals: Terminal[] = data.split('|').map(t => ({
          Name: t.trim(),
          IsCardPresent: true
        }));
        this.terminalsSubject.next(terminals);
      }
    } catch (error) {
      console.error('Terminal parse hatası:', error);
    }
  }

  /**
   * Sertifika listesini parse eder
   */
  private parseCertificates(data: string): void {
    try {
      if (data && data.trim()) {
        // Sertifikalar | ile ayrılmış, her sertifika ; ile ayrılmış alanlar içerir
        const certStrings = data.split('|');
        const certificates: Certificate[] = certStrings.map(certStr => {
          const parts = certStr.split(';');
          return {
            SerialNumber: parts[0] || '',
            IssuerCommonName: parts[1] || '',
            SubjectCommonName: parts[2] || '',
            ValidFrom: parts[3] || '',
            ValidTo: parts[4] || '',
            Thumbprint: parts[5] || ''
          };
        }).filter(cert => cert.SerialNumber); // Boş sertifikaları filtrele
        
        this.certificatesSubject.next(certificates);
      }
    } catch (error) {
      console.error('Sertifika parse hatası:', error);
    }
  }

  /**
   * JSON mesaj bloğu oluşturur
   */
  private createJsonBlock(data: string, islemId: string, sertifikaId: string = 'sertifikaId'): string {
    const jsonBlock = {
      data: data,
      kullaniciId: this.kullaniciId,
      received: '',
      islemId: islemId,
      sertifikaId: sertifikaId
    };
    return JSON.stringify(jsonBlock);
  }

  /**
   * WebSocket üzerinden veri gönderir
   */
  private sendData(data: string, islemId: string, sertifikaId?: string): void {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      const message = sertifikaId 
        ? this.createJsonBlock(data, islemId, sertifikaId)
        : this.createJsonBlock(data, islemId);
      this.webSocket.send(message);
    } else {
      throw new Error('WebSocket bağlantısı kapalı. Lütfen e-imza uygulamasının çalıştığından emin olun.');
    }
  }

  /**
   * Belirli bir işlem ID'si için yanıt bekler
   */
  private waitForResponse(islemId: string, timeout: number = 60000): Observable<EimzaResponse> {
    return new Observable(observer => {
      const timeoutHandle = setTimeout(() => {
        subscription.unsubscribe();
        observer.error(new Error('İşlem zaman aşımına uğradı'));
      }, timeout);

      const subscription = this.messageSubject.subscribe(response => {
        if (response.islemId === islemId) {
          clearTimeout(timeoutHandle);
          
          if (response.success) {
            observer.next(response);
            observer.complete();
          } else {
            observer.error(new Error(response.error || 'İşlem başarısız'));
          }
          
          subscription.unsubscribe();
        }
      });
    });
  }

  /**
   * Blob'u Base64'e çevirir
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ==================== PUBLIC API METODLARI ====================

  /**
   * Bağlantı durumunu kontrol eder
   */
  public isConnected(): boolean {
    return this.webSocket && this.webSocket.readyState === WebSocket.OPEN;
  }

  /**
   * Kart kütüphanesini ayarlar
   */
  public setCardLibrary(dllName: string): void {
    this.selectedDll = dllName;
  }

  /**
   * Bağlantı testi yapar
   */
  public testConnection(): Observable<EimzaResponse> {
    this.sendData('', '1');
    return this.waitForResponse('1', 5000);
  }

  /**
   * Terminal (kart okuyucu) listesini getirir
   */
  public getTerminals(): Observable<EimzaResponse> {
    this.sendData('', '2');
    return this.waitForResponse('2', 10000);
  }

  /**
   * Kart kütüphanesini gönderir ve sertifikaları getirir
   */
  public sendCardLibraryAndGetCertificates(dllName: string): Observable<EimzaResponse> {
    this.selectedDll = dllName;
    this.sendData(dllName, '9');
    
    // Kütüphane gönderimi başarılı olunca sertifikaları al
    return new Observable(observer => {
      this.waitForResponse('9', 10000).subscribe(
        () => {
          // Kütüphane başarılı, şimdi sertifikaları al
          setTimeout(() => {
            this.sendData('', '3');
            this.waitForResponse('3', 10000).subscribe(
              response => {
                observer.next(response);
                observer.complete();
              },
              error => observer.error(error)
            );
          }, 500);
        },
        error => observer.error(error)
      );
    });
  }

  /**
   * Akıllı karta giriş yapar (PIN ile)
   */
  public login(terminalName: string, pin: string): Observable<EimzaResponse> {
    // Terminal adı ve PIN'i birleştir
    const loginData = `${terminalName};${pin}`;
    this.sendData(loginData, '4');
    return this.waitForResponse('4', 30000);
  }

  /**
   * Sertifika seçer
   */
  public selectCertificate(serialNumber: string): Observable<EimzaResponse> {
    this.sendData(serialNumber, '5');
    return this.waitForResponse('5', 10000);
  }

  /**
   * PDF imzalar
   */
  public signPdf(pdfBlob: Blob): Observable<string> {
    return new Observable(observer => {
      // Blob'u Base64'e çevir
      this.blobToBase64(pdfBlob).then(base64Data => {
        
        // UI modunu false olarak ayarla
        this.sendData('false', '14');
        
        // İmzalanacak veriyi gönder
        setTimeout(() => {
          this.sendData(base64Data, '12');
          
          // İmzalama yanıtını bekle
          this.waitForResponse('12', 120000).subscribe(
            response => {
              observer.next(response.data); // İmzalı PDF base64
              observer.complete();
            },
            error => observer.error(error)
          );
        }, 500);
        
      }).catch(error => {
        observer.error(new Error('PDF base64 dönüşümü başarısız'));
      });
    });
  }

  /**
   * İstemci uygulamasını kapatır
   */
  public closeClient(): void {
    this.sendData('', '11');
  }

  /**
   * WebSocket bağlantısını kapatır
   */
  public disconnect(): void {
    if (this.webSocket) {
      this.webSocket.close();
      this.connectionSubject.next(false);
    }
  }

  /**
   * Mevcut sertifika listesini döndürür
   */
  public getCurrentCertificates(): Certificate[] {
    return this.certificatesSubject.value;
  }

  /**
   * Mevcut terminal listesini döndürür
   */
  public getCurrentTerminals(): Terminal[] {
    return this.terminalsSubject.value;
  }
}