import { Component, EventEmitter, Input, OnInit, Output, ViewChild, AfterViewInit } from '@angular/core';
import { IFileUploadService } from '../../services/ifileuploadservice';
import { RaporOzet } from '../../apimodel/raporozet';
import { IMessageService } from '../../services/imessageservice';
import { map } from 'rxjs/operators';

@Component({
  selector: 'mskbs-websocket-eimza',
  templateUrl: './websocket-esignature.component.html',
  styleUrls: ['./websocket-esignature.component.scss']
})
export class WebSocketEsignatureComponent implements OnInit, AfterViewInit {

  @ViewChild('pdfViewer') public pdfViewer;

  // Mevcut görüntülenen PDF indeksi
  public currentIndex = 0;
  
  // Toplam rapor sayısı
  public totalReports = 0;
  
  // Geri dönecek rapor listesi (tüm raporlar - secili true/false ile)
  public returnReportList: RaporOzet[] = [];
  
  // Görüntülenecek raporlar (validasyonu geçenler)
  private validReports: RaporOzet[] = [];
  
  // Tüm raporlar (input olarak gelenler)
  private allReports: RaporOzet[] = [];
  
  // PDF loading durumu
  public isPdfLoading: boolean = false;
  public pdfError: string = '';

  @Input() set viewModel(reports: RaporOzet[]) {
    if (!reports || reports.length === 0) {
      return;
    }

    console.log('📥 Input alındı:', reports.length, 'rapor');
    
    // Tüm raporları sakla
    this.allReports = [...reports];
    
    // Validasyonu geçenleri filtrele
    this.validReports = this.filterValidReports(reports);
    
    console.log('✅ Validasyonu geçen:', this.validReports.length, 'rapor');
    console.log('❌ Validasyonu geçmeyen:', this.allReports.length - this.validReports.length, 'rapor');
    
    this.totalReports = this.validReports.length;
    this.currentIndex = 0;
    
    // İlk raporu yükle
    if (this.validReports.length > 0) {
      this.loadCurrentPdf();
    }
  }

  @Output() finished: EventEmitter<RaporOzet[]> = new EventEmitter<RaporOzet[]>();

  constructor(
    private fileUploadService: IFileUploadService,
    private messageService: IMessageService
  ) { }

  ngOnInit() { }

  ngAfterViewInit() { }

  /**
   * Validasyonu geçen raporları filtrele
   * Kural: durumu "Yeni" OLMAYAN raporlar açılabilir
   */
  private filterValidReports(reports: RaporOzet[]): RaporOzet[] {
    const validReports: RaporOzet[] = [];
    const invalidReports: RaporOzet[] = [];

    reports.forEach(report => {
      // TODO: Durumu kontrolü - sizin validasyon kuralınıza göre düzenleyin
      // Örnek: durumu "Yeni" olanlar açılmasın
      if (report.durumu === 'Yeni' || report.durumu === 'NEW') {
        invalidReports.push(report);
        console.log('❌ Validasyon geçmedi:', report.raporKayitNo, '- Durum:', report.durumu);
      } else {
        validReports.push(report);
      }
    });

    // Validasyonu geçemeyenleri kullanıcıya bildir
    if (invalidReports.length > 0) {
      const message = invalidReports.length + ' rapor durumu "Yeni" olduğu için açılamadı: ' +
        invalidReports.map(r => r.raporKayitNo).join(', ');
      this.messageService.showWarning(message);
    }

    return validReports;
  }

  /**
   * Mevcut PDF'i yükle
   */
  private loadCurrentPdf() {
    if (this.currentIndex >= this.validReports.length) {
      console.log('⚠️ Geçersiz index:', this.currentIndex);
      return;
    }

    const currentReport = this.validReports[this.currentIndex];
    const pdfBinaryDataId = currentReport.raporPdfKayitNo;

    console.log('📄 PDF yükleniyor:', currentReport.raporKayitNo, '(', (this.currentIndex + 1), '/', this.totalReports, ')');

    if (!pdfBinaryDataId) {
      this.pdfError = 'PDF bulunamadı';
      console.error('❌ PDF Binary Data ID yok:', currentReport.raporKayitNo);
      return;
    }

    this.isPdfLoading = true;
    this.pdfError = '';

    this.downloadFile(pdfBinaryDataId).subscribe(
      (res: Blob) => {
        if (this.pdfViewer) {
          this.pdfViewer.pdfSrc = res;
          this.pdfViewer.refresh();
        }
        this.isPdfLoading = false;
        console.log('✅ PDF yüklendi');
      },
      (err) => {
        this.pdfError = 'PDF yüklenirken hata oluştu';
        this.isPdfLoading = false;
        console.error('❌ PDF yükleme hatası:', err);
      }
    );
  }

  private downloadFile(dataId: string): any {
    const input = { dataId: dataId, mimeType: "application/pdf" };
    return this.fileUploadService.downloadBinaryData(input.dataId, input.mimeType).pipe(
      map((result: any) => {
        return new Blob([result.body]);
      })
    );
  }

  /**
   * Kaydet butonu - Bu raporu onayla (secili: true)
   */
  onSave() {
    const currentReport = this.validReports[this.currentIndex];
    
    console.log('✅ Kaydet:', currentReport.raporKayitNo);
    
    // Secili true olarak işaretle
    currentReport.secili = true;
    
    // Listeye ekle
    this.returnReportList.push(currentReport);
    
    // Sonraki PDF'e geç veya bitir
    this.goNextOrFinish();
  }

  /**
   * Vazgeç butonu - Bu raporu reddet (secili: false)
   */
  onCancel() {
    const currentReport = this.validReports[this.currentIndex];
    
    console.log('❌ Vazgeç:', currentReport.raporKayitNo);
    
    // Secili false olarak işaretle
    currentReport.secili = false;
    
    // Listeye ekle
    this.returnReportList.push(currentReport);
    
    // Sonraki PDF'e geç veya bitir
    this.goNextOrFinish();
  }

  /**
   * Sonraki PDF'e geç veya tamamla
   */
  private goNextOrFinish() {
    if (this.currentIndex < this.totalReports - 1) {
      // Sonraki PDF'e geç
      this.currentIndex++;
      console.log('➡️ Sonraki PDF:', this.currentIndex + 1, '/', this.totalReports);
      this.loadCurrentPdf();
    } else {
      // Tüm PDF'ler tamamlandı
      console.log('🎉 Tüm PDF\'ler tamamlandı');
      this.finishReview();
    }
  }

  /**
   * İnceleme tamamlandı - Sonucu parent'a gönder
   */
  private finishReview() {
    console.log('📊 İnceleme tamamlandı');
    console.log('  - Kaydet:', this.returnReportList.filter(r => r.secili).length);
    console.log('  - Vazgeç:', this.returnReportList.filter(r => !r.secili).length);
    
    // TÜM raporları döndür (validasyonu geçemeyenler + seçim yapılanlar)
    // Validasyonu geçemeyenlerin secili'si zaten false
    const allReportsWithSelection = this.allReports.map(report => {
      // Bu rapor için seçim yapıldı mı?
      const selectedReport = this.returnReportList.find(r => r.raporKayitNo === report.raporKayitNo);
      
      if (selectedReport) {
        // Seçim yapıldı, güncel secili değerini kullan
        return { ...report, secili: selectedReport.secili };
      } else {
        // Validasyonu geçemedi veya görüntülenmedi, secili false
        return { ...report, secili: false };
      }
    });
    
    // Parent component'e emit et
    this.finished.emit(allReportsWithSelection);
    
    // Component'i sıfırla
    this.reset();
  }

  /**
   * Component'i sıfırla
   */
  private reset() {
    this.currentIndex = 0;
    this.totalReports = 0;
    this.returnReportList = [];
    this.validReports = [];
    this.allReports = [];
    this.isPdfLoading = false;
    this.pdfError = '';
  }

  /**
   * Progress bilgisi
   */
  public getProgress(): string {
    return (this.currentIndex + 1) + ' / ' + this.totalReports;
  }

  /**
   * Mevcut rapor bilgisi
   */
  public getCurrentReportInfo(): string {
    if (this.validReports.length === 0) {
      return '';
    }
    const report = this.validReports[this.currentIndex];
    return 'Rapor No: ' + report.raporKayitNo;
  }

}