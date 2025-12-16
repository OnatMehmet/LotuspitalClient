import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { IESignatureService } from '../../services/iesignatureservice';
import { IFileUploadService } from '../../services/ifileuploadservice';
import { IModalStateService } from '../../services/imodalstateservice';
import { IModalInfo } from '../../model/imodalinfo';
import { ModalResult } from '../../model/modalresult';
import { DialogResult } from '../../model/dialogresult';
import { map } from 'rxjs/operators';
import { ReportService } from '../../report/services/report.service';
import { Subscription } from 'rxjs';
// YENİ: WebSocket servisi
import { WebSocketESignatureService } from '../../services/websocket-esignature.service';

@Component({
  selector: 'app-pdfsign',
  templateUrl: './pdfsign.component.html',
  styleUrls: ['./pdfsign.component.scss']
})
export class PdfSignComponent implements OnInit, AfterViewInit, OnDestroy, IModalInfo {

  public modalDialogTitle: string = 'Rapor Pdf İmzalama';
  public modalDialogWidth = 900;
  public modalDialogHeight = 700;
  public errorMessage: string;
  private pdfBytes: Blob;
  private dataId: string;

  @ViewChild('pdfViewer') public pdfViewer;

  // ============ YENİ ÖZELLIKLER (WebSocket için) ============
  public isSigningInProgress: boolean = false;
  public successMessage: string = '';
  public selectedDll: string = 'akisp11.dll';
  
  private subscriptions: Subscription[] = [];
  private signatureResponseReceived: boolean = false;
  // ============ YENİ ÖZELLIKLER SONU ============

  constructor(
    private fileUploadService: IFileUploadService,
    private esignatureService: IESignatureService,
    private modalStateService: IModalStateService,
    private wsESignatureService: WebSocketESignatureService // YENİ servis
  ) { }

  public setInputParameter(inputParameter: any) {
    this.dataId = inputParameter;
  }

  ngOnInit() {
    // WebSocket mesaj dinleme - her zaman aktif (bağlantı olmasa da)
    this.subscriptions.push(
      this.wsESignatureService.getMessages().subscribe(response => {
        this.handleWebSocketMessage(response);
      })
    );
  }

  ngAfterViewInit() {
    const that = this;
    if (this.dataId) {
      this.downloadFile(this.dataId).subscribe(
        (res) => {
          that.pdfBytes = res;
          that.pdfViewer.pdfSrc = res;
          that.pdfViewer.refresh();
        }
      );
    }
  }

  ngOnDestroy() {
    // Component kapanırken bağlantıyı kapat
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.wsESignatureService.disconnect();
  }

  private downloadFile(dataId: string): any {
    const input = { dataId: dataId, mimeType: "application/pdf" };
    return this.fileUploadService.downloadBinaryData(input.dataId, input.mimeType).pipe(
      map((result: any) => {
        return new Blob([result.body]);
      })
    );
  }

  private b64toBlob(b64Data, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    let byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ============ ESKİ METOD (İSTERSENİZ KULLANIN) ============
  onSignPdfOld() {
    const that = this;
    this.esignatureService.showLoginModal().then(r => {
      that.esignatureService.signPdf(this.pdfBytes).subscribe(r => {
        const formData = new FormData();
        const byteCharacters = that.b64toBlob(r.Result.PdfBytes, 'application/pdf');
        formData.append('PdfBytes', byteCharacters);
        that.fileUploadService.uploadFile(formData).subscribe(upres => {
          const modalResult = new ModalResult();
          modalResult.dialogResult = DialogResult.OK;
          modalResult.resultValue = upres;
          that.modalStateService.executeAction(this, modalResult);
        }, err => {
          that.errorMessage = err.error.Message;
        })
      }, err => {
        that.errorMessage = err.error.Message;
      });
    });
  }

  // ============ YENİ METOD: WebSocket ile İmzalama ============
  async onSignPdf() {
    const that = this;

    // PDF hazır mı?
    if (!this.pdfBytes) {
      this.errorMessage = 'PDF yüklenmedi';
      return;
    }

    // İmzalama başlat
    this.isSigningInProgress = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.signatureResponseReceived = false;

    try {
      // 1. WebSocket bağlantısını kur
      console.log('WebSocket bağlantısı kuruluyor...');
      const connected = await this.wsESignatureService.connectAsync('angular_user_' + Date.now());
      
      if (!connected) {
        throw new Error('WebSocket bağlantısı kurulamadı. TurkTrust istemci uygulamasının çalıştığından emin olun.');
      }

      console.log('WebSocket bağlantısı başarılı');

      // 2. PDF'i base64'e çevir
      const pdfBase64 = await this.blobToBase64(this.pdfBytes);

      // 3. Kart kütüphanesini gönder
      this.wsESignatureService.sendCardType(this.selectedDll);

      // 4. PDF'i imzalat (TurkTrust PIN penceresi açılacak)
      setTimeout(() => {
        that.wsESignatureService.signWithCAdESUI(pdfBase64, false);
        console.log('PDF imzalama isteği gönderildi, TurkTrust PIN ekranı açılacak...');
      }, 500);

    } catch (error) {
      console.error('İmzalama hatası:', error);
      this.errorMessage = error.message || 'İmzalama işlemi başarısız';
      this.isSigningInProgress = false;
      
      // Hata durumunda bağlantıyı kapat
      this.wsESignatureService.disconnect();
    }
  }

  // ============ WebSocket mesajlarını işle ============
  private handleWebSocketMessage(response: any) {
    console.log('İşlem ID:', response.islemId, 'Yanıt:', response);

    // Hata kontrolü
    if (response.hataMesaji) {
      this.errorMessage = response.hataMesaji;
      this.isSigningInProgress = false;
      this.wsESignatureService.disconnect();
      return;
    }

    // İmzalama yanıtı (islemId: "12" veya "2")
    if ((response.islemId === '12' || response.islemId === '2') && !this.signatureResponseReceived) {
      this.signatureResponseReceived = true;
      this.handleSignResponse(response);
    }
  }

  // ============ İmza yanıtı - İmzalı PDF'i işle ============
  private handleSignResponse(response: any) {
    const that = this;

    if (response.data) {
      const signedPdfBase64 = response.data;
      console.log('İmzalı PDF alındı, uzunluk:', signedPdfBase64.length);
      
      try {
        // Backend'e gönder
        const formData = new FormData();
        const blob = that.b64toBlob(signedPdfBase64, 'application/pdf');
        formData.append('PdfBytes', blob);
        
        that.fileUploadService.uploadFile(formData).subscribe(
          upres => {
            that.successMessage = 'PDF başarıyla imzalandı ve yüklendi';
            that.isSigningInProgress = false;
            
            // WebSocket bağlantısını kapat
            that.wsESignatureService.disconnect();
            
            // Modal'ı kapat
            setTimeout(() => {
              const modalResult = new ModalResult();
              modalResult.dialogResult = DialogResult.OK;
              modalResult.resultValue = upres;
              that.modalStateService.executeAction(this, modalResult);
            }, 1000);
          },
          err => {
            that.errorMessage = err.error && err.error.Message ? err.error.Message : 'Dosya yükleme hatası';
            that.isSigningInProgress = false;
            that.wsESignatureService.disconnect();
          }
        );
      } catch (error) {
        that.errorMessage = 'İmzalı dosya işlenirken hata oluştu: ' + error.message;
        that.isSigningInProgress = false;
        that.wsESignatureService.disconnect();
      }
    } else {
      this.errorMessage = 'İmzalanmış veri alınamadı';
      this.isSigningInProgress = false;
      this.wsESignatureService.disconnect();
    }
  }

  onCancel() {
    // İptal edildiğinde bağlantıyı kapat
    this.wsESignatureService.disconnect();
    
    const modalResult = new ModalResult();
    modalResult.dialogResult = DialogResult.CANCEL;
    this.modalStateService.executeAction(this, modalResult);
  }

}
