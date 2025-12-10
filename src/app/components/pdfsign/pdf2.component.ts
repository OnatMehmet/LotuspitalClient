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
  private selectedDll = 'akisp11.dll';
  
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
    console.log('[WS Service] Servis oluşturuldu');
    this.initializeWebSocket();
  }

  /**
   * WebSocket bağlantısını başlatır
   */
  private initializeWebSocket(): void {
    try {
      const path = `ws://${this.wsAddress}:${this.wsPort}/ws/${this.wsUri}`;
      console.log('[WS Service] Bağlantı kuruluyor:', path);
      
      this.webSocket = new WebSocket(path, 'sec-websocket-protocol');
      
      this.webSocket.onopen = () => {
        console.log('[WS Service] ✅ Bağlantı başarılı');
        this.connectionSubject.next(true);
      };
      
      this.webSocket.onmessage = (event) => {
        console.log('[WS Service] 📨 Mesaj alındı:', event.data);
        this.handleMessage(event);
      };
      
      this.webSocket.onerror = (error) => {
        console.error('[WS Service] ❌ Hata:', error);
        this.connectionSubject.next(false);
      };
      
      this.webSocket.onclose = () => {
        console.log('[WS Service] ⚠️ Bağlantı kapandı');
        this.connectionSubject.next(false);
        
        // 5 saniye sonra yeniden bağlan
        setTimeout(() => {
          console.log('[WS Service] 🔄 Yeniden bağlanılıyor...');
          this.initializeWebSocket();
        }, 5000);
      };
      
    } catch (error) {
      console.error('[WS Service] ❌ Başlatma hatası:', error);
      this.connectionSubject.next(false);
    }
  }

  /**
   * Gelen mesajları işler
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const response: EimzaMessage = JSON.parse(event.data);
      console.log('[WS Service] 📦 Parse edildi - İşlem ID:', response.islemId);
      
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
          console.log('[WS Service] Terminal listesi parse ediliyor...');
          this.parseTerminals(response.data);
          break;
        case '3': // Sertifika listesi
          console.log('[WS Service] Sertifika listesi parse ediliyor...');
          this.parseCertificates(response.data);
          break;
      }
      
      this.messageSubject.next(result);
    } catch (error) {
      console.error('[WS Service] ❌ Mesaj parse hatası:', error);
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
        console.log('[WS Service] Terminal parse edildi:', terminals.length, 'adet');
        this.terminalsSubject.next(terminals);
      } else {
        console.warn('[WS Service] Terminal verisi boş');
      }
    } catch (error) {
      console.error('[WS Service] Terminal parse hatası:', error);
    }
  }

  /**
   * Sertifika listesini parse eder
   */
  private parseCertificates(data: string): void {
    try {
      if (data && data.trim()) {
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
        }).filter(cert => cert.SerialNumber);
        
        console.log('[WS Service] Sertifika parse edildi:', certificates.length, 'adet');
        this.certificatesSubject.next(certificates);
      } else {
        console.warn('[WS Service] Sertifika verisi boş');
      }
    } catch (error) {
      console.error('[WS Service] Sertifika parse hatası:', error);
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
      
      console.log('[WS Service] 📤 Mesaj gönderiliyor - İşlem ID:', islemId);
      this.webSocket.send(message);
    } else {
      throw new Error('WebSocket bağlantısı kapalı. Lütfen e-imza uygulamasının çalıştığından emin olun.');
    }
  }

  /**
   * Belirli bir işlem ID'si için yanıt bekler
   */
  private waitForResponse(islemId: string, timeout: number = 60000): Observable<EimzaResponse> {
    console.log('[WS Service] ⏳ Yanıt bekleniyor - İşlem ID:', islemId);
    
    return new Observable(observer => {
      const timeoutHandle = setTimeout(() => {
        subscription.unsubscribe();
        console.error('[WS Service] ⏰ Timeout - İşlem ID:', islemId);
        observer.error(new Error('İşlem zaman aşımına uğradı'));
      }, timeout);

      const subscription = this.messageSubject.subscribe(response => {
        if (response.islemId === islemId) {
          clearTimeout(timeoutHandle);
          console.log('[WS Service] ✅ Yanıt alındı - İşlem ID:', islemId, 'Başarılı:', response.success);
          
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

  public isConnected(): boolean {
    return this.webSocket && this.webSocket.readyState === WebSocket.OPEN;
  }

  public setCardLibrary(dllName: string): void {
    console.log('[WS Service] Kart kütüphanesi ayarlandı:', dllName);
    this.selectedDll = dllName;
  }

  public testConnection(): Observable<EimzaResponse> {
    console.log('[WS Service] 🧪 Bağlantı testi...');
    this.sendData('', '1');
    return this.waitForResponse('1', 5000);
  }

  public getTerminals(): Observable<EimzaResponse> {
    console.log('[WS Service] 📋 Terminal listesi isteniyor...');
    this.sendData('', '2');
    return this.waitForResponse('2', 10000);
  }

  public sendCardLibrary(dllName: string): Observable<EimzaResponse> {
    console.log('[WS Service] 📚 Kart kütüphanesi gönderiliyor:', dllName);
    this.selectedDll = dllName;
    this.sendData(dllName, '9');
    return this.waitForResponse('9', 10000);
  }

  public login(terminalName: string, pin: string): Observable<EimzaResponse> {
    console.log('[WS Service] 🔐 Login... Terminal:', terminalName);
    const loginData = `${terminalName};${pin}`;
    this.sendData(loginData, '4');
    return this.waitForResponse('4', 30000);
  }

  public getCertificates(): Observable<EimzaResponse> {
    console.log('[WS Service] 📜 Sertifika listesi isteniyor...');
    this.sendData('', '3');
    return this.waitForResponse('3', 10000);
  }

  public selectCertificate(serialNumber: string): Observable<EimzaResponse> {
    console.log('[WS Service] ✅ Sertifika seçiliyor:', serialNumber);
    this.sendData(serialNumber, '5');
    return this.waitForResponse('5', 10000);
  }

  public signPdf(pdfBlob: Blob): Observable<string> {
    console.log('[WS Service] 📝 PDF imzalama başlatılıyor...');
    
    return new Observable(observer => {
      this.blobToBase64(pdfBlob).then(base64Data => {
        console.log('[WS Service] PDF Base64 dönüşümü tamamlandı');
        
        // UI modunu false olarak ayarla
        this.sendData('false', '14');
        
        // İmzalanacak veriyi gönder
        setTimeout(() => {
          this.sendData(base64Data, '12');
          
          // İmzalama yanıtını bekle
          this.waitForResponse('12', 120000).subscribe(
            response => {
              console.log('[WS Service] ✅ PDF başarıyla imzalandı');
              observer.next(response.data);
              observer.complete();
            },
            error => {
              console.error('[WS Service] ❌ İmzalama hatası:', error);
              observer.error(error);
            }
          );
        }, 500);
        
      }).catch(error => {
        console.error('[WS Service] ❌ Base64 dönüşüm hatası:', error);
        observer.error(new Error('PDF base64 dönüşümü başarısız'));
      });
    });
  }

  public closeClient(): void {
    console.log('[WS Service] 🔌 İstemci kapatılıyor...');
    this.sendData('', '11');
  }

  public disconnect(): void {
    console.log('[WS Service] ❌ Bağlantı kapatılıyor...');
    if (this.webSocket) {
      this.webSocket.close();
      this.connectionSubject.next(false);
    }
  }

  public getCurrentCertificates(): Certificate[] {
    return this.certificatesSubject.value;
  }

  public getCurrentTerminals(): Terminal[] {
    return this.terminalsSubject.value;
  }
}
