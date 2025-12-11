import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { IFileUploadService } from '../../services/ifileuploadservice';
import { IModalStateService } from '../../services/imodalstateservice';
import { IModalDialogService } from '../../services/imodaldialogservice';
import { IModalInfo } from '../../model/imodalinfo';
import { ModalResult } from '../../model/modalresult';
import { DialogResult } from '../../model/dialogresult';
import { CardLoginComponent } from '../cardlogin/cardlogin.component';
import { WebSocketEimzaService } from '../services/websocket-eimza.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-pdfsign',
  templateUrl: './pdfsign.component.html',
  styleUrls: ['./pdfsign.component.scss']
})
export class PdfSignComponent implements OnInit, AfterViewInit, IModalInfo {

  public modalDialogTitle: string = 'Rapor Pdf İmzalama';
  public modalDialogWidth = 900;
  public modalDialogHeight = 700;
  public errorMessage: string;
  
  private pdfBytes: Blob;
  private dataId: string;

  @ViewChild('pdfViewer') public pdfViewer;

  constructor(
    private fileUploadService: IFileUploadService,
    private wsEimzaService: WebSocketEimzaService,
    private modalStateService: IModalStateService,
    private modalDialogService: IModalDialogService
  ) {
    console.log('[PdfSign] Component oluşturuldu');
  }

  public setInputParameter(inputParameter: any) {
    this.dataId = inputParameter;
    console.log('[PdfSign] Data ID:', this.dataId);
  }

  ngOnInit() {
    console.log('[PdfSign] ngOnInit');
  }

  ngAfterViewInit() {
    console.log('[PdfSign] ngAfterViewInit - PDF yükleniyor...');
    const that = this;
    
    if (this.dataId) {
      this.downloadFile(this.dataId).subscribe(
        (res) => {
          console.log('[PdfSign] ✅ PDF yüklendi');
          that.pdfBytes = res;
          that.pdfViewer.pdfSrc = res;
          that.pdfViewer.refresh();
        },
        (error) => {
          console.error('[PdfSign] PDF yükleme hatası:', error);
          that.errorMessage = 'PDF yüklenirken hata oluştu';
        }
      );
    } else {
      console.warn('[PdfSign] Data ID yok!');
    }
  }

  /**
   * PDF dosyasını indirir
   */
  private downloadFile(dataId: string): any {
    const input = { dataId: dataId, mimeType: "application/pdf" };
    return this.fileUploadService.downloadBinaryData(input.dataId, input.mimeType).pipe(
      map((result: any) => {
        return new Blob([result.body]);
      })
    );
  }

  /**
   * Base64'ü Blob'a çevirir
   */
  private b64toBlob(b64Data: string, contentType = '', sliceSize = 512): Blob {
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

  /**
   * PDF İmzalama - WEBSOCKET SİSTEMİ
   */
  onSignPdf() {
    console.log('[PdfSign] onSignPdf() çağrıldı');
    const that = this;

    // WebSocket bağlantı kontrolü
    if (!this.wsEimzaService.isConnected()) {
      this.errorMessage = 'E-İmza uygulamasına bağlanılamadı. Lütfen JNLP uygulamasının çalıştığından emin olun.';
      console.error('[PdfSign] WebSocket bağlantısı yok!');
      return;
    }

    // PDF kontrolü
    if (!this.pdfBytes) {
      this.errorMessage = 'PDF yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.';
      console.error('[PdfSign] PDF bytes yok!');
      return;
    }

    console.log('[PdfSign] CardLogin modal açılıyor...');
    this.errorMessage = '';

    // 1. CardLogin modal'ını aç (Terminal seçimi + PIN + Sertifika seçimi)
    this.modalDialogService.showModal(CardLoginComponent).then(
      (loginResult: ModalResult) => {
        console.log('[PdfSign] CardLogin modal sonucu:', loginResult.dialogResult);
        
        if (loginResult.dialogResult !== DialogResult.OK) {
          that.errorMessage = 'Sertifika seçimi iptal edildi.';
          console.warn('[PdfSign] Sertifika seçimi iptal edildi');
          return;
        }

        console.log('[PdfSign] ✅ Sertifika seçildi');
        console.log('[PdfSign] Sertifika bilgisi:', loginResult.resultValue);

        // 2. Sertifika seçimi başarılı, şimdi PDF'i imzala
        console.log('[PdfSign] PDF imzalama başlatılıyor...');
        that.signPdfWithWebSocket();
      },
      (loginError) => {
        that.errorMessage = 'Sertifika seçimi sırasında hata oluştu.';
        console.error('[PdfSign] Login modal hatası:', loginError);
      }
    );
  }

  /**
   * WebSocket ile PDF imzalama
   */
  private signPdfWithWebSocket(): void {
    console.log('[PdfSign] signPdfWithWebSocket() başladı');
    const that = this;

    this.wsEimzaService.signPdf(this.pdfBytes).subscribe(
      (signedBase64: string) => {
        console.log('[PdfSign] ✅ PDF başarıyla imzalandı');
        console.log('[PdfSign] İmzalı PDF sunucuya yükleniyor...');
        
        // 3. İmzalı PDF'i Blob'a çevir ve sunucuya yükle
        const formData = new FormData();
        const byteCharacters = that.b64toBlob(signedBase64, 'application/pdf');
        formData.append('PdfBytes', byteCharacters);

        that.fileUploadService.uploadFile(formData).subscribe(
          (uploadResult) => {
            console.log('[PdfSign] ✅ İmzalı PDF sunucuya yüklendi');

            // 4. Modal'ı kapat ve sonucu döndür
            const modalResult = new ModalResult();
            modalResult.dialogResult = DialogResult.OK;
            modalResult.resultValue = uploadResult;
            
            console.log('[PdfSign] Modal kapatılıyor');
            that.modalStateService.executeAction(this, modalResult);
          },
          (uploadError) => {
            that.errorMessage = uploadError.error?.Message || 'İmzalı PDF yüklenirken hata oluştu';
            console.error('[PdfSign] Upload hatası:', uploadError);
          }
        );
      },
      (signError) => {
        that.errorMessage = signError.message || 'PDF imzalama hatası';
        console.error('[PdfSign] İmzalama hatası:', signError);
      }
    );
  }

  /**
   * İptal butonu
   */
  onCancel() {
    console.log('[PdfSign] İptal edildi');
    const modalResult = new ModalResult();
    modalResult.dialogResult = DialogResult.CANCEL;
    this.modalStateService.executeAction(this, modalResult);
  }
}