import { Injectable } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';

export interface WebSocketMessage {
  data: string;
  kullaniciId: string;
  received: string;
  islemId: string;
  sertifikaId: string;
}

export interface EImzaResponse {
  data: string;
  islemId: string;
  kullaniciId: string;
  hataMesaji: string;
  sertifikaId: string;
  akilliKartIsim: string;
}

export interface DllOption {
  value: string;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketESignatureService {
  private webSocket: WebSocket = null;
  private messageSubject = new Subject<EImzaResponse>();
  private connectionSubject = new BehaviorSubject<boolean>(false);
  private address: string = '127.0.0.1';
  private port: string = '5000';
  private uri: string = '';
  private kullaniciId: string = '';

  // DLL/Kart kütüphanesi seçenekleri
  public readonly dllOptions: DllOption[] = [
    { value: 'akisp11.dll', label: 'Turktrust, Tubitak' },
    { value: 'eTPKCS11.dll', label: 'E-güven' },
    { value: 'aetpkss1.dll', label: 'E-Tuğra' }
  ];

  constructor() { }

  /**
   * WebSocket bağlantısını başlatır
   * Promise döner - await ile kullanılabilir
   */
  connectAsync(kullaniciId: string = 'testUser1', address?: string, port?: string): Promise<boolean> {
    if (address) { this.address = address; }
    if (port) { this.port = port; }
    this.kullaniciId = kullaniciId;

    // Eğer zaten bağlıysa, direkt true dön
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      console.log('WebSocket zaten bağlı');
      return Promise.resolve(true);
    }

    // Önceki bağlantıyı kapat
    if (this.webSocket) {
      this.webSocket.close();
    }

    const path = 'ws://' + this.address + ':' + this.port + '/ws/' + this.uri;
    const that = this;
    
    return new Promise((resolve, reject) => {
      try {
        this.webSocket = new WebSocket(path, 'sec-websocket-protocol');

        this.webSocket.onopen = function() {
          console.log('TurkTrust WebSocket bağlantısı kuruldu:', path);
          that.connectionSubject.next(true);
          resolve(true);
        };

        this.webSocket.onmessage = function(event) {
          try {
            const response: EImzaResponse = JSON.parse(event.data);
            console.log('WebSocket mesajı alındı:', response);
            that.messageSubject.next(response);
          } catch (error) {
            console.error('Mesaj parse hatası:', error);
          }
        };

        this.webSocket.onerror = function(error) {
          console.error('WebSocket hatası:', error);
          that.connectionSubject.next(false);
          reject(new Error('WebSocket bağlantı hatası'));
        };

        this.webSocket.onclose = function() {
          console.log('WebSocket bağlantısı kapatıldı');
          that.connectionSubject.next(false);
        };

        // 5 saniye timeout
        setTimeout(() => {
          if (that.webSocket.readyState !== WebSocket.OPEN) {
            that.webSocket.close();
            reject(new Error('WebSocket bağlantı zaman aşımı'));
          }
        }, 5000);

      } catch (error) {
        console.error('WebSocket oluşturma hatası:', error);
        this.connectionSubject.next(false);
        reject(error);
      }
    });
  }

  /**
   * Eski connect metodu (geriye uyumluluk için)
   */
  connect(kullaniciId: string = 'testUser1', address?: string, port?: string): Observable<boolean> {
    this.connectAsync(kullaniciId, address, port).then(
      () => this.connectionSubject.next(true),
      () => this.connectionSubject.next(false)
    );
    return this.connectionSubject.asObservable();
  }

  /**
   * JSON formatında mesaj oluşturur
   */
  private toJsonBlock(stringData: string, islemId: string, sertifikaId: string = 'sertifikaId'): string {
    const jsonBlock: WebSocketMessage = {
      data: stringData,
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
  private sendData(stringData: string, islemId: string): void {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      const message = this.toJsonBlock(stringData, islemId);
      this.webSocket.send(message);
      console.log('Mesaj gönderildi:', message);
    } else {
      console.error('WebSocket bağlantısı açık değil');
      throw new Error('WebSocket bağlantısı açık değil. Lütfen önce bağlantı kurun.');
    }
  }

  /**
   * Sertifika ID ile veri gönderir
   */
  private sendDataWithSertId(stringData: string, islemId: string, sertifikaId: string): void {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      const message = this.toJsonBlock(stringData, islemId, sertifikaId);
      this.webSocket.send(message);
      console.log('Mesaj gönderildi (sertifika ile):', message);
    } else {
      console.error('WebSocket bağlantısı açık değil');
      throw new Error('WebSocket bağlantısı açık değil. Lütfen önce bağlantı kurun.');
    }
  }

  /**
   * Gelen mesajları dinlemek için Observable döner
   */
  getMessages(): Observable<EImzaResponse> {
    return this.messageSubject.asObservable();
  }

  /**
   * Bağlantı durumunu döner
   */
  getConnectionStatus(): Observable<boolean> {
    return this.connectionSubject.asObservable();
  }

  /**
   * Bağlantının açık olup olmadığını kontrol eder
   */
  isConnected(): boolean {
    return this.webSocket !== null && this.webSocket.readyState === WebSocket.OPEN;
  }

  /**
   * WebSocket bağlantısını kapatır
   */
  disconnect(): void {
    if (this.webSocket) {
      console.log('WebSocket bağlantısı kapatılıyor...');
      this.webSocket.close();
      this.webSocket = null;
      this.connectionSubject.next(false);
    }
  }

  /**
   * Bağlantı testi yapar - islemId: "1"
   */
  testConnection(): void {
    this.sendData('', '1');
  }

  /**
   * Kart tipi/DLL gönderir - islemId: "9"
   */
  sendCardType(dllName: string): void {
    this.sendData(dllName, '9');
  }

  /**
   * CAdES imzalama işlemi başlatır
   * islemId: "14" (false gönder) ve "12" (hash değeri ile imzalama)
   */
  signWithCAdESUI(base64Hash: string, useCAdES: boolean = false): void {
    // Önce CAdES tercihini gönder
    this.sendData(useCAdES ? 'true' : 'false', '14');
    // Sonra hash değerini imzalat
    this.sendData(base64Hash, '12');
  }

  /**
   * Direkt imzalama işlemi - islemId: "12"
   */
  signData(base64Hash: string, sertifikaId?: string): void {
    if (sertifikaId) {
      this.sendDataWithSertId(base64Hash, '12', sertifikaId);
    } else {
      this.sendData(base64Hash, '12');
    }
  }

  /**
   * İstemci uygulamasını kapatır - islemId: "11"
   */
  closeClientApplication(): void {
    this.sendData('', '11');
  }

  /**
   * Kullanıcı ID'sini ayarlar
   */
  setKullaniciId(kullaniciId: string): void {
    this.kullaniciId = kullaniciId;
  }

  /**
   * Kullanıcı ID'sini döner
   */
  getKullaniciId(): string {
    return this.kullaniciId;
  }
}
