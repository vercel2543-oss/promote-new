import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Award,
  Calendar,
  History,
  FileDown,
  Loader2,
  Users,
  Edit3,
  Check,
  X,
  CalendarDays,
} from 'lucide-react';
import { exportToCSV, getGradeInfo } from '../utils/evaluationCalculator';
import { AggregatedResult, User } from '../types';
import { downloadIndividualPdf } from '../utils/pdfExport';

interface ReportsCenterViewProps {
  onOpenReport: (result: AggregatedResult) => void;
}

export const ReportsCenterView: React.FC<ReportsCenterViewProps> = ({ onOpenReport }) => {
  const { aggregatedResults, auditLogs, gradeThresholds, systemSettings, users, updateUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'reports' | 'leave_summary' | 'audit'>('reports');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Leave stats editing state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editLeaveForm, setEditLeaveForm] = useState({
    lateDays: 0,
    lateTimes: 0,
    sickDays: 0,
    sickTimes: 0,
    personalDays: 0,
    personalTimes: 0,
    maternityDays: 0,
    ordinationDays: 0,
    absentDays: 0,
    totalLeaveDays: 0,
    note: '',
  });

  const staffUsers = users.filter((u) => u.role === 'staff');

  const getTotalLeaveDays = (s?: User['leaveStats']) => {
    if (!s) return 0;
    return (
      (s.sick?.days || 0) +
      (s.personal?.days || 0) +
      (s.maternity?.days || 0) +
      (s.ordinationOrHajj?.days || 0) +
      (s.absent?.days || 0) +
      (s.other?.days || 0)
    );
  };

  const filteredResults = aggregatedResults.filter(
    (r) =>
      r.evaluatee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.evaluatee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.evaluatee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStaff = staffUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.employeeCode && u.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const staffWithLeave = staffUsers.filter(
    (u) => getTotalLeaveDays(u.leaveStats) > 0 || (u.leaveStats?.late?.times || 0) > 0
  );
  const staffZeroLeave = staffUsers.filter(
    (u) => getTotalLeaveDays(u.leaveStats) === 0 && (u.leaveStats?.late?.times || 0) === 0
  );

  // Export Leave Stats to UTF-8 BOM CSV (Opens directly in Excel without garbled text)
  const exportLeaveStatsToCSV = (staffList: User[]) => {
    const headers = [
      'ลำดับ',
      'รหัสบุคลากร',
      'ชื่อ-นามสกุล',
      'ตำแหน่ง',
      'กลุ่มสายงาน',
      'มาสาย (วัน)',
      'มาสาย (ครั้ง)',
      'ลาป่วย (วัน)',
      'ลาป่วย (ครั้ง)',
      'ลากิจ (วัน)',
      'ลากิจ (ครั้ง)',
      'ลาคลอด (วัน)',
      'ลาอุปสมบท/ฮัจย์ (วัน)',
      'ขาดราชการ (วัน)',
      'รวมวันลาทั้งหมด (วัน)',
      'หมายเหตุ',
    ];

    const rows = staffList.map((u, idx) => {
      const s = u.leaveStats;
      return [
        idx + 1,
        `"${u.employeeCode || u.username}"`,
        `"${u.name}"`,
        `"${u.position}"`,
        `"${u.department || '-'}"`,
        s?.late?.days ?? 0,
        s?.late?.times ?? 0,
        s?.sick?.days ?? 0,
        s?.sick?.times ?? 0,
        s?.personal?.days ?? 0,
        s?.personal?.times ?? 0,
        s?.maternity?.days ?? 0,
        s?.ordinationOrHajj?.days ?? 0,
        s?.absent?.days ?? 0,
        getTotalLeaveDays(s),
        `"${s?.notes || '-'}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `สถิติวันลา-48บุคลากร-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startEditLeave = (user: User) => {
    setEditingUser(user);
    const s = user.leaveStats;
    const total = getTotalLeaveDays(s);
    setEditLeaveForm({
      lateDays: s?.late?.days ?? 0,
      lateTimes: s?.late?.times ?? 0,
      sickDays: s?.sick?.days ?? 0,
      sickTimes: s?.sick?.times ?? 0,
      personalDays: s?.personal?.days ?? 0,
      personalTimes: s?.personal?.times ?? 0,
      maternityDays: s?.maternity?.days ?? 0,
      ordinationDays: s?.ordinationOrHajj?.days ?? 0,
      absentDays: s?.absent?.days ?? 0,
      totalLeaveDays: total,
      note: s?.notes ?? '',
    });
  };

  const handleSaveLeave = () => {
    if (!editingUser) return;
    const computedTotal =
      (Number(editLeaveForm.sickDays) || 0) +
      (Number(editLeaveForm.personalDays) || 0) +
      (Number(editLeaveForm.maternityDays) || 0) +
      (Number(editLeaveForm.ordinationDays) || 0) +
      (Number(editLeaveForm.absentDays) || 0);

    const updatedUser: User = {
      ...editingUser,
      leaveStats: {
        late: {
          days: Number(editLeaveForm.lateDays) || 0,
          times: Number(editLeaveForm.lateTimes) || 0,
        },
        sick: {
          days: Number(editLeaveForm.sickDays) || 0,
          times: Number(editLeaveForm.sickTimes) || 0,
        },
        personal: {
          days: Number(editLeaveForm.personalDays) || 0,
          times: Number(editLeaveForm.personalTimes) || 0,
        },
        maternity: {
          days: Number(editLeaveForm.maternityDays) || 0,
          times: Number(editLeaveForm.maternityDays) > 0 ? 1 : 0,
        },
        ordinationOrHajj: {
          days: Number(editLeaveForm.ordinationDays) || 0,
          times: Number(editLeaveForm.ordinationDays) > 0 ? 1 : 0,
        },
        absent: {
          days: Number(editLeaveForm.absentDays) || 0,
          times: Number(editLeaveForm.absentDays) > 0 ? 1 : 0,
        },
        other: editingUser.leaveStats?.other || { days: 0, times: 0 },
        notes: editLeaveForm.note.trim() || undefined,
      },
    };

    updateUser(updatedUser);
    setEditingUser(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-700" />
            <h2 className="text-xl font-bold text-slate-900">
              ศูนย์รายงานและเอกสารผลการประเมิน (Reports &amp; Documentation)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            พิมพ์แบบรายงานทางการ (Official Gov Form) และบันทึกประวัติการตรวจสอบย้อนหลัง (Audit Log)
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportToCSV(aggregatedResults)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>ส่งออกสรุปภาพรวมทั้งหมด (Excel)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          เอกสารรายงานรายบุคคล ({aggregatedResults.length})
        </button>
        <button
          onClick={() => setActiveTab('leave_summary')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'leave_summary'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>สถิติวันลาและการมาปฏิบัติราชการ ({staffUsers.length} คน)</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ประวัติการตรวจสอบ (Audit Trail: {auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Individual Evaluation Reports */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Search Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้รับการประเมิน หรือ ตำแหน่ง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 hidden sm:block">
              พร้อมพิมพ์เอกสารรายงานราชการ A4 / PDF
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredResults.map((item) => {
              const gradeInfo = getGradeInfo(item.finalGrade, gradeThresholds);
              return (
                <div
                  key={item.evaluateeId}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                        {item.evaluatee.name}
                      </h4>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${gradeInfo.badgeBg}`}>
                        {item.finalGrade} ({item.meanPercentage.toFixed(2)}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      ตำแหน่ง: <span className="font-semibold text-blue-700">{item.evaluatee.position}</span> | 
                      กลุ่ม: {item.groupName}
                    </p>
                    <div className="text-[11px] text-slate-400">
                      กรรมการส่งคะแนนแล้ว: {item.submittedCommitteeCount} / {item.totalCommitteeCount} ท่าน
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setDownloadingId(item.evaluateeId);
                        try {
                          await downloadIndividualPdf(item, systemSettings, gradeThresholds);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setDownloadingId(null);
                        }
                      }}
                      disabled={downloadingId === item.evaluateeId}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                      title="ดาวน์โหลดไฟล์ .PDF ของบุคคลนี้ทันที ตัวอักษรไม่เพี้ยน"
                    >
                      {downloadingId === item.evaluateeId ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>กำลังโหลด...</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="w-3.5 h-3.5 text-emerald-100" />
                          <span>ดาวน์โหลด PDF</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenReport(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>เปิดดูแบบรายงาน (Official PDF)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Leave & Attendance Summary (สถิติวันลา 48 บุคลากร) */}
      {activeTab === 'leave_summary' && (
        <div className="space-y-4">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">ผู้รับการประเมิน</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">{staffUsers.length} คน</span>
              <span className="text-[11px] text-blue-600 block mt-0.5">ครบถ้วน 48 รายการ</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">มีประวัติการลา</span>
              <span className="text-xl font-black text-amber-700 mt-1 block">{staffWithLeave.length} คน</span>
              <span className="text-[11px] text-amber-600 block mt-0.5">บันทึกสถิติครบ</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">มาปฏิบัติงาน 100%</span>
              <span className="text-xl font-black text-emerald-700 mt-1 block">{staffZeroLeave.length} คน</span>
              <span className="text-[11px] text-emerald-600 block mt-0.5">ไม่มีวันลา/มาสาย</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">สำรองบน Firebase</span>
              <span className="text-xl font-black text-indigo-700 mt-1 block">100%</span>
              <span className="text-[11px] text-indigo-600 block mt-0.5">ซิงค์แบบ Real-time</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, ตำแหน่ง หรือรหัสบุคลากร..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportLeaveStatsToCSV(staffUsers)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออกสถิติวันลาทั้งหมด (Excel / CSV)</span>
                </button>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">ลำดับ</th>
                    <th className="py-3 px-3 min-w-[200px]">ผู้รับการประเมิน</th>
                    <th className="py-3 px-3 min-w-[140px]">ตำแหน่ง / สายงาน</th>
                    <th className="py-3 px-2 text-center bg-amber-50/50">มาสาย</th>
                    <th className="py-3 px-2 text-center bg-blue-50/50">ลาป่วย</th>
                    <th className="py-3 px-2 text-center bg-purple-50/50">ลากิจ</th>
                    <th className="py-3 px-2 text-center">ลาคลอด</th>
                    <th className="py-3 px-2 text-center">บวช/ฮัจย์</th>
                    <th className="py-3 px-2 text-center bg-rose-50/50">ขาด</th>
                    <th className="py-3 px-2 text-center font-black bg-slate-100">รวมวันลา</th>
                    <th className="py-3 px-3 min-w-[130px]">หมายเหตุ</th>
                    <th className="py-3 px-3 text-center w-16">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-slate-400">
                        ไม่พบข้อมูลบุคลากรตามคำค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((u, idx) => {
                      const s = u.leaveStats;
                      const totalLeaves = getTotalLeaveDays(s);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                                  {u.name.slice(0, 1)}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {u.employeeCode && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      ({u.employeeCode})
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-blue-700">{u.position}</div>
                            <div className="text-[11px] text-slate-400">{u.department || '-'}</div>
                          </td>
                          <td className="py-3 px-2 text-center bg-amber-50/30">
                            {s?.late?.times ? (
                              <span className="font-bold text-amber-700">
                                {s.late.days || 0} วัน ({s.late.times} ครั้ง)
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center bg-blue-50/30">
                            {s?.sick?.days ? (
                              <span className="font-bold text-blue-700">
                                {s.sick.days} วัน ({s.sick.times || 1} ครั้ง)
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center bg-purple-50/30">
                            {s?.personal?.days ? (
                              <span className="font-bold text-purple-700">
                                {s.personal.days} วัน ({s.personal.times || 1} ครั้ง)
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {s?.maternity?.days ? (
                              <span className="font-bold text-pink-700">{s.maternity.days} วัน</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {s?.ordinationOrHajj?.days ? (
                              <span className="font-bold text-indigo-700">{s.ordinationOrHajj.days} วัน</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center bg-rose-50/30">
                            {s?.absent?.days ? (
                              <span className="font-bold text-rose-700">{s.absent.days} วัน</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center font-black bg-slate-50">
                            {totalLeaves > 0 ? (
                              <span className="text-slate-900 bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded-full">
                                {totalLeaves} วัน
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold">0 วัน</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-500">
                            {s?.notes || '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => startEditLeave(u)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="แก้ไขข้อมูลวันลาของบุคคลนี้"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inline Leave Editing Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-blue-600" />
                      <span>แก้ไขสถิติวันลา: {editingUser.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{editingUser.position}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">มาสาย (วัน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editLeaveForm.lateDays}
                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, lateDays: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">มาสาย (ครั้ง)</label>
                    <input
                      type="number"
                      min={0}
                      value={editLeaveForm.lateTimes}
                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, lateTimes: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ลาป่วย (วัน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editLeaveForm.sickDays}
                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, sickDays: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ลาป่วย (ครั้ง)</label>
                    <input
                      type="number"
                      min={0}
                      value={editLeaveForm.sickTimes}
                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, sickTimes: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ลากิจ (วัน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editLeaveForm.personalDays}
                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, personalDays: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ลากิจ (ครั้ง)</label>
                    <input
                      type="number"
                      min={0}
                      value={editLeaveForm.personalTimes}
                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, personalTimes: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ลาคลอด (วัน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editLeaveForm.maternityDays}
                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, maternityDays: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ขาดราชการ (วัน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editLeaveForm.absentDays}
                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, absentDays: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">หมายเหตุเพิ่มเติม</label>
                    <input
                      type="text"
                      placeholder="เช่น ใบรับรองแพทย์ครบถ้วน..."
                      value={editLeaveForm.note}
                      onChange={(e) => setEditLeaveForm({ ...editLeaveForm, note: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLeave}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    บันทึกข้อมูลและซิงค์ Cloud
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Security & Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>บันทึกความปลอดภัยและประวัติการลงคะแนน (Anti-Tampering Trail)</span>
            </h3>
            <span className="text-xs text-slate-400">ระบบบันทึกเวลาสากล ISO-8601</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="font-bold text-slate-900 font-sans">{log.userName}</span>
                  </div>
                  <div className="text-slate-600 font-sans text-xs">{log.details}</div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleString('th-TH')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
