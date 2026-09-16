import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Database, ExternalLink, X, ShieldCheck } from 'lucide-react';

export const QuotaWarningBanner: React.FC = () => {
  const { isFirestoreQuotaExceeded } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isFirestoreQuotaExceeded || isDismissed) {
    return null;
  }

  return (
    <div
      id="firestore-quota-banner"
      className="bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6 shadow-xs relative z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5 md:mt-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-amber-900 flex items-center gap-2 flex-wrap">
              <span>โควต้าเขียน Firebase Firestore (Spark Plan) ครบขีดจำกัดรายวัน</span>
              <span className="inline-flex items-center gap-1 bg-amber-200/80 text-amber-800 text-[11px] font-medium px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                โหมดออฟไลน์ปลอดภัย (LocalStorage Active)
              </span>
            </div>
            <p className="text-amber-800/90 mt-0.5 leading-relaxed">
              ระบบป้องกันการหยุดชะงักโดยบันทึกข้อมูลทุกอย่างลงในอุปกรณ์ของท่านโดยอัตโนมัติ ไม่สูญหาย และสามารถทำรายการประเมิน
              พิมพ์รายงาน ได้ตามปกติ โควต้า Firestore ฟรี (20,000 เขียน/วัน) จะรีเซ็ตเวลา 14:00 น. ในวันถัดไป
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <a
            href="https://console.firebase.google.com/project/form-promote2/firestore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium text-xs transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Firebase Console</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href="https://firebase.google.com/pricing#cloud-firestore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 font-medium text-xs transition-colors"
          >
            <span>รายละเอียดโควต้า</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-md hover:bg-amber-200/60 text-amber-700 transition-colors ml-1"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
