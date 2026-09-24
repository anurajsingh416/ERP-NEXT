// =========================================================
// ORIGINAL
// =========================================================



// "use client";
// import React, { useState, useEffect } from "react";
// import {
//   Box, Paper, Grid, Typography, TextField, MenuItem, Button,
//   Card, CardContent, CircularProgress, Alert
// } from "@mui/material";
// import dayjs from "dayjs";
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
// } from "recharts";
// import * as XLSX from "xlsx";
// import SupplierLedger from "@/components/reports/SupplierLedger";

// const formatCurrency = (value) => `₹${value?.toFixed(2) || 0}`;

// export default function PurchaseReportPage() {
//   const [suppliers, setSuppliers] = useState([]);
//   const [selectedSupplier, setSelectedSupplier] = useState("");
//   const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
//   const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
//   const [ledgerData, setLedgerData] = useState(null);
//   const [loadingSuppliers, setLoadingSuppliers] = useState(false);
//   const [error, setError] = useState("");

//   // Fetch suppliers for dropdown
//   useEffect(() => {
//     const fetchSuppliers = async () => {
//       setLoadingSuppliers(true);
//       try {
//         const token = localStorage.getItem("token");
//         const res = await fetch("/api/suppliers", {
//           headers: { Authorization: `Bearer ${token}` }
//         });
//         const data = await res.json();
//         if (data.success) setSuppliers(data.data);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoadingSuppliers(false);
//       }
//     };
//     fetchSuppliers();
//   }, []);

//   // Handle refresh from SupplierLedger (gets updated data)
//   const handleLedgerRefresh = (newData) => {
//     setLedgerData(newData);
//   };

//   // Compute summary and chart data from ledger transactions
//   const transactions = ledgerData?.transactions || [];
//   const totalPurchase = transactions.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
//   const totalPaid = transactions.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
//   const totalPending = transactions.reduce((sum, t) => sum + (t.remainingAmount || 0), 0);
//   const invoiceCount = transactions.length;

//   // Group by month for chart
//   const chartData = transactions.reduce((acc, tx) => {
//     const month = dayjs(tx.date).format("YYYY-MM");
//     const existing = acc.find(item => item.month === month);
//     if (existing) {
//       existing.amount += tx.grandTotal;
//     } else {
//       acc.push({ month, amount: tx.grandTotal });
//     }
//     return acc;
//   }, []).sort((a, b) => a.month.localeCompare(b.month));

//   // Export to Excel
//   const exportToExcel = () => {
//     const exportRows = transactions.map(tx => ({
//       "Invoice No": tx.invoiceNo,
//       "Date": dayjs(tx.date).format("DD/MM/YYYY"),
//       "Grand Total": tx.grandTotal,
//       "Paid": tx.paidAmount,
//       "Pending": tx.remainingAmount,
//       "Running Balance": tx.runningBalance,
//     }));
//     const ws = XLSX.utils.json_to_sheet(exportRows);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Supplier Ledger");
//     XLSX.writeFile(wb, `purchase_report_${dayjs().format("YYYYMMDD")}.xlsx`);
//   };

//   return (
//     <Box sx={{ p: 3 }}>
//       <Typography variant="h4" gutterBottom>Purchase Report</Typography>

//       {/* Filters: Supplier + Date Range */}
//       <Paper sx={{ p: 2, mb: 3 }}>
//         <Grid container spacing={2} alignItems="center">
//           <Grid item xs={12} sm={4}>
//             <TextField
//               select
//               fullWidth
//               label="Supplier"
//               value={selectedSupplier}
//               onChange={(e) => setSelectedSupplier(e.target.value)}
//               disabled={loadingSuppliers}
//             >
//               <MenuItem value="">-- Select Supplier --</MenuItem>
//               {suppliers.map(sup => (
//                 <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
//               ))}
//             </TextField>
//           </Grid>
//           <Grid item xs={12} sm={3}>
//             <TextField
//               type="date"
//               label="From Date"
//               fullWidth
//               value={startDate}
//               onChange={(e) => setStartDate(e.target.value)}
//               InputLabelProps={{ shrink: true }}
//             />
//           </Grid>
//           <Grid item xs={12} sm={3}>
//             <TextField
//               type="date"
//               label="To Date"
//               fullWidth
//               value={endDate}
//               onChange={(e) => setEndDate(e.target.value)}
//               InputLabelProps={{ shrink: true }}
//             />
//           </Grid>
//           <Grid item xs={12} sm={2}>
//             <Button variant="contained" fullWidth onClick={() => {/* refresh is automatic via props change */}}>
//               Apply
//             </Button>
//           </Grid>
//         </Grid>
//       </Paper>

//       {selectedSupplier ? (
//         <>
//           {/* Summary Cards */}
//           <Grid container spacing={2} sx={{ mb: 3 }}>
//             <Grid item xs={12} sm={6} md={3}>
//               <Card>
//                 <CardContent>
//                   <Typography color="textSecondary" gutterBottom>Total Purchase</Typography>
//                   <Typography variant="h5">{formatCurrency(totalPurchase)}</Typography>
//                 </CardContent>
//               </Card>
//             </Grid>
//             <Grid item xs={12} sm={6} md={3}>
//               <Card>
//                 <CardContent>
//                   <Typography color="textSecondary" gutterBottom>Total Paid</Typography>
//                   <Typography variant="h5" color="green">{formatCurrency(totalPaid)}</Typography>
//                 </CardContent>
//               </Card>
//             </Grid>
//             <Grid item xs={12} sm={6} md={3}>
//               <Card>
//                 <CardContent>
//                   <Typography color="textSecondary" gutterBottom>Total Pending</Typography>
//                   <Typography variant="h5" color="error">{formatCurrency(totalPending)}</Typography>
//                 </CardContent>
//               </Card>
//             </Grid>
//             <Grid item xs={12} sm={6} md={3}>
//               <Card>
//                 <CardContent>
//                   <Typography color="textSecondary" gutterBottom>Invoice Count</Typography>
//                   <Typography variant="h5">{invoiceCount}</Typography>
//                 </CardContent>
//               </Card>
//             </Grid>
//           </Grid>

//           {/* Chart */}
//           {chartData.length > 0 && (
//             <Paper sx={{ p: 2, mb: 3 }}>
//               <Typography variant="h6" gutterBottom>Purchase Trend (Monthly)</Typography>
//               <ResponsiveContainer width="100%" height={300}>
//                 <BarChart data={chartData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="month" />
//                   <YAxis />
//                   <Tooltip formatter={(value) => formatCurrency(value)} />
//                   <Legend />
//                   <Bar dataKey="amount" fill="#8884d8" name="Purchase Amount" />
//                 </BarChart>
//               </ResponsiveContainer>
//             </Paper>
//           )}

//           {/* Export Button */}
//           <Box display="flex" justifyContent="flex-end" sx={{ mb: 2 }}>
//             <Button variant="outlined" onClick={exportToExcel} disabled={transactions.length === 0}>
//               Export to Excel
//             </Button>
//           </Box>

//           {/* Supplier Ledger Component (receives date range) */}
//           <SupplierLedger
//             supplierId={selectedSupplier}
//             startDate={startDate}
//             endDate={endDate}
//             onRefresh={handleLedgerRefresh}
//           />
//         </>
//       ) : (
//         <Paper sx={{ p: 3, textAlign: "center" }}>
//           <Typography>Please select a supplier to view the report</Typography>
//         </Paper>
//       )}

//       {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
//     </Box>
//   );
// }


// 'use client';

// import React, { useEffect, useState } from 'react';
// import * as XLSX from 'xlsx';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

// import {
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
// } from 'recharts';

// export default function PurchaseReportPage() {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchInvoices = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) throw new Error("No token found");

//         const res = await fetch("/api/purchaseInvoice?limit=10000", {
//           headers: {
//             "Authorization": `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         });

//         if (!res.ok) throw new Error(`API Error: ${res.status}`);

//         const json = await res.json();

//         if (Array.isArray(json)) {
//           setData(json);
//         } else if (Array.isArray(json.data)) {
//           setData(json.data);
//         } else {
//           console.error("Unexpected API response:", json);
//           setData([]);
//         }
//       } catch (err) {
//         console.error("Fetch error:", err);
//         setError(err.message);
//         setData([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchInvoices();
//   }, []);

//   const totalPurchases = Array.isArray(data)
//     ? data.reduce((acc, item) => acc + (item.grandTotal || 0), 0)
//     : 0;

//   const totalPaid = Array.isArray(data)
//     ? data.reduce((acc, item) => acc + (item.paidAmount || 0), 0)
//     : 0;

//   const totalPending = Array.isArray(data)
//     ? data.reduce((acc, item) => acc + (item.remainingAmount || 0), 0)
//     : 0;

//   const chartData = Array.isArray(data)
//     ? Object.values(
//       data.reduce((acc, curr) => {
//         const date = curr.postingDate ? new Date(curr.postingDate).toLocaleDateString() : "Unknown";
//         if (!acc[date]) acc[date] = { date, total: 0 };
//         acc[date].total += curr.grandTotal || 0;
//         return acc;
//       }, {})
//     )
//     : [];

//   const exportToExcel = () => {
//     const worksheet = XLSX.utils.json_to_sheet(
//       data.map(item => ({
//         Invoice: item.documentNumberPurchaseInvoice,
//         Supplier: item.supplierName,
//         Date: item.postingDate ? new Date(item.postingDate).toLocaleDateString() : "",
//         Total: item.grandTotal,
//         Paid: item.paidAmount,
//         Pending: item.remainingAmount,
//         Status: item.paymentStatus,
//       }))
//     );
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchases');
//     XLSX.writeFile(workbook, 'Purchase_Report.xlsx');
//   };

//   const exportToPDF = () => {
//     const doc = new jsPDF();
//     doc.text('Purchase Report', 14, 16);
//     const tableData = data.map(item => [
//       item.documentNumberPurchaseInvoice,
//       item.supplierName,
//       item.postingDate ? new Date(item.postingDate).toLocaleDateString() : "",
//       `₹${item.grandTotal}`,
//       item.paymentStatus,
//     ]);
//     autoTable(doc, {
//       startY: 20,
//       head: [['Invoice', 'Supplier', 'Date', 'Amount', 'Status']],
//       body: tableData,
//     });
//     doc.save('Purchase_Report.pdf');
//   };

//   const STATUS_STYLES = {
//     Pending: "bg-amber-50 text-amber-600",
//     Partial: "bg-blue-50 text-blue-600",
//     Paid: "bg-green-50 text-green-600",
//   };

//   if (loading) return <div className="p-6 text-gray-400">Loading purchase report...</div>;

//   return (
//     <div className="p-6 min-h-screen bg-gray-50">
//       <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Purchase Report</h1>

//       {error && (
//         <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
//           {error}
//         </div>
//       )}

//       {/* Summary strip */}
//       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//           <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">Total Purchases</p>
//           <p className="text-xl font-extrabold text-gray-900 mt-1">₹{totalPurchases.toLocaleString("en-IN")}</p>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//           <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">Total Paid</p>
//           <p className="text-xl font-extrabold text-green-600 mt-1">₹{totalPaid.toLocaleString("en-IN")}</p>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//           <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">Total Pending</p>
//           <p className="text-xl font-extrabold text-red-500 mt-1">₹{totalPending.toLocaleString("en-IN")}</p>
//         </div>
//       </div>

//       {/* Chart Section */}
//       <div className="mb-6">
//         <h2 className="text-xl font-semibold mb-2 text-gray-800">Overview Chart</h2>
//         <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-4">
//           {chartData.length > 0 ? (
//             <ResponsiveContainer width="100%" height={300}>
//               <LineChart data={chartData}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="date" />
//                 <YAxis />
//                 <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
//                 <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} />
//               </LineChart>
//             </ResponsiveContainer>
//           ) : (
//             <p className="text-gray-400 text-sm">No data to display</p>
//           )}
//         </div>
//       </div>

//       {/* Table Section */}
//       <div className="overflow-x-auto mb-4 bg-white rounded-2xl shadow-sm border border-gray-100">
//         <h2 className="text-xl font-semibold p-4 pb-2 text-gray-800">Invoice Table</h2>
//         <table className="min-w-full text-sm">
//           <thead className="bg-gray-50">
//             <tr>
//               {["Invoice No", "Supplier", "Posting Date", "Amount", "Status"].map((h) => (
//                 <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {data.length === 0 ? (
//               <tr><td colSpan={5} className="text-center py-10 text-gray-400">No purchase invoices found</td></tr>
//             ) : (
//               data.map((inv) => (
//                 <tr key={inv._id || inv.documentNumberPurchaseInvoice} className="border-t border-gray-50 hover:bg-indigo-50/20">
//                   <td className="px-4 py-3 font-mono text-xs text-indigo-600">{inv.documentNumberPurchaseInvoice}</td>
//                   <td className="px-4 py-3 font-medium text-gray-800">{inv.supplierName}</td>
//                   <td className="px-4 py-3 text-gray-500">{inv.postingDate ? new Date(inv.postingDate).toLocaleDateString("en-GB") : "—"}</td>
//                   <td className="px-4 py-3 font-semibold text-gray-800">₹{Number(inv.grandTotal || 0).toLocaleString("en-IN")}</td>
//                   <td className="px-4 py-3">
//                     <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.paymentStatus] || "bg-gray-100 text-gray-500"}`}>
//                       {inv.paymentStatus}
//                     </span>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Export Buttons */}
//       <div className="flex gap-3 mt-4">
//         <button onClick={exportToExcel} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
//           Export Excel
//         </button>
//         <button onClick={exportToPDF} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold">
//           Export PDF
//         </button>
//       </div>
//     </div>
//   );
// }

'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const STAGE_CONFIG = [
  { key: "requests", label: "Purchase Requests", href: "/admin/purchase-request-view", statuses: ["Draft", "Pending", "Quoted", "Ordered", "Partially Ordered", "Received", "Cancelled"] },
  { key: "quotations", label: "Quotations", href: "/admin/PurchaseQuotationList", statuses: ["Open", "CopiedToOrder", "ConvertedToOrder", "PartiallyOrdered", "FullyOrdered", "Rejected"] },
  { key: "orders", label: "Purchase Orders", href: "/admin/purchase-order-view", statuses: ["Open", "PartiallyReceived", "FullyReceived", "Closed", "Cancelled"] },
];

const STATUS_COLORS = {
  Draft: "bg-gray-100 text-gray-500", Pending: "bg-amber-50 text-amber-600", Quoted: "bg-purple-50 text-purple-600",
  Ordered: "bg-green-50 text-green-600", "Partially Ordered": "bg-blue-50 text-blue-600", Received: "bg-teal-50 text-teal-600",
  Cancelled: "bg-red-50 text-red-500", Open: "bg-blue-50 text-blue-600", CopiedToOrder: "bg-purple-50 text-purple-600",
  ConvertedToOrder: "bg-green-50 text-green-600", PartiallyOrdered: "bg-amber-50 text-amber-600", FullyOrdered: "bg-green-50 text-green-600",
  Rejected: "bg-red-50 text-red-500", PartiallyReceived: "bg-amber-50 text-amber-600", FullyReceived: "bg-green-50 text-green-600",
  Closed: "bg-gray-100 text-gray-500", Pending_: "bg-amber-50 text-amber-600", Partial: "bg-blue-50 text-blue-600", Paid: "bg-green-50 text-green-600",
};

export default function PurchaseReportPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found");
        const res = await fetch("/api/purchase-report", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to load report");
        setReport(json.data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const exportFull = async (format) => {
    setExporting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/purchaseInvoice?limit=10000", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const rows = Array.isArray(json) ? json : json.data || [];

      if (format === "excel") {
        const worksheet = XLSX.utils.json_to_sheet(
          rows.map((item) => ({
            Invoice: item.documentNumberPurchaseInvoice,
            Supplier: item.supplierName,
            Date: item.postingDate ? new Date(item.postingDate).toLocaleDateString() : "",
            Total: item.grandTotal,
            Paid: item.paidAmount,
            Pending: item.remainingAmount,
            Status: item.paymentStatus,
          }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Purchases");
        XLSX.writeFile(workbook, "Purchase_Report.xlsx");
      } else {
        const doc = new jsPDF();
        doc.text("Purchase Report", 14, 16);
        autoTable(doc, {
          startY: 20,
          head: [["Invoice", "Supplier", "Date", "Amount", "Status"]],
          body: rows.map((item) => [
            item.documentNumberPurchaseInvoice,
            item.supplierName,
            item.postingDate ? new Date(item.postingDate).toLocaleDateString() : "",
            `₹${item.grandTotal}`,
            item.paymentStatus,
          ]),
        });
        doc.save("Purchase_Report.pdf");
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const formatIndianCompact = (num) => {
    const n = Number(num);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
  };

  if (loading) return <div className="p-6 text-gray-400">Loading purchase report...</div>;
  if (error) return <div className="p-6"><div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div></div>;
  if (!report) return null;

  const { requests, quotations, orders, invoices, monthlyTrend, topSuppliers, recentInvoices } = report;
  const dataByStage = { requests, quotations, orders };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900">Purchase Report</h1>
        <div className="flex gap-2">
          <button onClick={() => exportFull("excel")} disabled={exporting}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
          <button onClick={() => exportFull("pdf")} disabled={exporting}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Financial summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">Total Spend</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">₹{invoices.totals.totalSpend.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-0.5">{invoices.totals.count} invoices</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">Total Paid</p>
          <p className="text-2xl font-extrabold text-green-600 mt-1">₹{invoices.totals.totalPaid.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">Total Pending</p>
          <p className="text-2xl font-extrabold text-red-500 mt-1">₹{invoices.totals.totalPending.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* ── Pipeline stage breakdown — full status detail, not just one number ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {STAGE_CONFIG.map((stage) => {
          const stageData = dataByStage[stage.key] || {};
          const totalCount = Object.values(stageData).reduce((s, v) => s + v.count, 0);
          return (
            <a key={stage.key} href={stage.href}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-md transition-all block">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">{stage.label}</p>
                <span className="text-xs font-bold text-gray-400">{totalCount} total</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stage.statuses.map((s) => {
                  const entry = stageData[s];
                  if (!entry || entry.count === 0) return null;
                  return (
                    <span key={s} className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[s] || "bg-gray-100 text-gray-500"}`}>
                      {s}: {entry.count}
                    </span>
                  );
                })}
                {totalCount === 0 && <span className="text-xs text-gray-300">No records yet</span>}
              </div>
            </a>
          );
        })}
      </div>

      {/* ── Trend chart ── */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2 text-gray-800">Monthly Spend Trend</h2>
        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-4">
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={formatIndianCompact} width={70} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No invoice data yet</p>
          )}
        </div>
      </div>

      {/* ── Top suppliers ── */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2 text-gray-800">Top Suppliers by Spend</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {topSuppliers.length === 0 ? (
            <p className="p-4 text-gray-400 text-sm">No supplier spend yet</p>
          ) : (
            topSuppliers.map((s, i) => (
              <div key={s._id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{s._id || "Unknown Supplier"}</p>
                    <p className="text-xs text-gray-400">{s.invoiceCount} invoices</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900">₹{s.total.toLocaleString("en-IN")}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Recent invoices table ── */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold p-4 pb-2 text-gray-800">Recent Invoices</h2>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Invoice No", "Supplier", "Posting Date", "Amount", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentInvoices.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No purchase invoices found</td></tr>
            ) : (
              recentInvoices.map((inv) => (
                <tr key={inv._id} className="border-t border-gray-50 hover:bg-indigo-50/20">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{inv.documentNumberPurchaseInvoice}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{inv.supplierName}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.postingDate ? new Date(inv.postingDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">₹{Number(inv.grandTotal || 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.paymentStatus] || "bg-gray-100 text-gray-500"}`}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}