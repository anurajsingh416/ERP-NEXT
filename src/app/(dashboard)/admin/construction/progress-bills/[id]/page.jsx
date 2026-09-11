// "use client";

// import { useEffect, useState, useRef } from "react";
// import { useParams, useRouter } from "next/navigation";
// import api from "@/lib/api";
// import {
//   FaArrowLeft,
//   FaFileInvoice,
//   FaPrint,
//   FaEdit,
//   FaCheck,
//   FaTimes,
//   FaBoxes,
// } from "react-icons/fa";
// import { toast } from "react-toastify";
// import ReactToPrint from "react-to-print";

// export default function ProgressBillDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [bill, setBill] = useState(null);
//   const componentRef = useRef();

//   useEffect(() => {
//     const fetchBill = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           router.push("/login");
//           return;
//         }
//         const headers = { headers: { Authorization: `Bearer ${token}` } };
//         const res = await api.get(`/construction/progress-billing?id=${id}`, headers);
//         setBill(res.data.data || res.data);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load bill.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchBill();
//   }, [id, router]);

//   const formatCurrency = (num) =>
//     new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center text-gray-400">Loading bill...</div>
//       </div>
//     );
//   }

//   if (!bill) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center text-gray-400">Bill not found.</div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
//       <div className="max-w-5xl mx-auto">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <div className="flex items-center gap-4">
//             <button
//               onClick={() => router.back()}
//               className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
//             >
//               <FaArrowLeft size={20} className="text-gray-600" />
//             </button>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
//               <FaFileInvoice className="text-indigo-600" /> {bill.billNumber}
//             </h1>
//           </div>
//           <div className="flex gap-2">
//             <ReactToPrint
//               trigger={() => (
//                 <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-600 text-white font-bold text-sm hover:bg-gray-700 transition-colors">
//                   <FaPrint size={14} /> Print
//                 </button>
//               )}
//               content={() => componentRef.current}
//             />
//             <button
//               onClick={() => router.push(`/admin/construction/progress-billing?edit=${bill._id}`)}
//               className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors"
//             >
//               <FaEdit size={14} /> Edit
//             </button>
//           </div>
//         </div>

//         {/* Bill Content (for print) */}
//         <div ref={componentRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
//           {/* Company Header */}
//           <div className="text-center border-b border-gray-200 pb-4 mb-6">
//             <h2 className="text-2xl font-bold text-gray-800">PROGRESS BILL</h2>
//             <p className="text-sm text-gray-500">Tax Invoice</p>
//           </div>

//           {/* Bill Info */}
//           <div className="grid grid-cols-2 gap-4 mb-6">
//             <div>
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bill Number</p>
//               <p className="text-lg font-bold text-gray-800">{bill.billNumber}</p>
//             </div>
//             <div className="text-right">
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
//               <p className="text-lg font-bold text-gray-800">
//                 {new Date(bill.billDate).toLocaleDateString("en-GB")}
//               </p>
//             </div>
//             <div>
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project</p>
//               <p className="text-lg font-bold text-gray-800">{bill.project?.name || "—"}</p>
//             </div>
//             <div className="text-right">
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</p>
//               <p className="text-lg font-bold text-gray-800 capitalize">{bill.orderType}</p>
//             </div>
//             <div>
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
//                 {bill.orderType === "customer" ? "Customer" : "Contractor"}
//               </p>
//               <p className="text-lg font-bold text-gray-800">
//                 {bill.orderType === "customer"
//                   ? bill.customer?.customerName || bill.customer?.name || "—"
//                   : bill.contractor?.supplierName || bill.contractor?.name || "—"}
//               </p>
//             </div>
//             <div className="text-right">
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
//               <p className="text-lg font-bold text-gray-800 capitalize">{bill.status}</p>
//             </div>
//           </div>

//           {/* Items Table */}
//           <div className="overflow-x-auto mb-6">
//             <table className="w-full text-sm border-collapse">
//               <thead className="bg-gray-50 border-b border-gray-200">
//                 <tr>
//                   <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
//                   <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</th>
//                   <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
//                   <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
//                   <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
//                   <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {bill.items?.map((item, idx) => (
//                   <tr key={idx} className="hover:bg-gray-50">
//                     <td className="px-4 py-2 text-center text-xs text-gray-400">{idx + 1}</td>
//                     <td className="px-4 py-2 text-xs text-gray-700">{item.description || "—"}</td>
//                     <td className="px-4 py-2 text-center text-xs text-gray-600">{item.unit}</td>
//                     <td className="px-4 py-2 text-center text-xs">{item.billedQuantity}</td>
//                     <td className="px-4 py-2 text-center text-xs">{item.rate}</td>
//                     <td className="px-4 py-2 text-right text-xs font-bold text-gray-700">{formatCurrency(item.amount)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Totals */}
//           <div className="border-t border-gray-200 pt-4">
//             <div className="flex justify-end">
//               <div className="w-64 space-y-1">
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">Subtotal:</span>
//                   <span className="font-bold text-gray-800">{formatCurrency(bill.total || 0)}</span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">VAT:</span>
//                   <span className="font-bold text-gray-800">{formatCurrency(bill.taxVAT || 0)}</span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">Service Tax:</span>
//                   <span className="font-bold text-gray-800">{formatCurrency(bill.taxService || 0)}</span>
//                 </div>
//                 <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
//                   <span className="text-gray-800">Grand Total:</span>
//                   <span className="text-indigo-700">{formatCurrency(bill.grandTotal || bill.total || 0)}</span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Remarks */}
//           {bill.remarks && (
//             <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
//               <p className="font-bold text-gray-400 uppercase tracking-wider text-xs">Remarks</p>
//               <p>{bill.remarks}</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

//=============================
//Commented during Build Error
//=============================
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaFileInvoice,
  FaPrint,
  FaEdit,
  FaCheck,
  FaTimes,
  FaBoxes,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useReactToPrint } from "react-to-print";

export default function ProgressBillDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const componentRef = useRef(null);

  // Hook handles printing directly to the referenced DOM node
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: bill ? `Progress-Bill-${bill.billNumber}` : "Progress-Bill",
  });

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/construction/progress-billing?id=${id}`, headers);
        setBill(res.data.data || res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load bill.");
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id, router]);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading bill...</div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Bill not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" /> {bill.billNumber}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-600 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
            >
              <FaPrint size={14} /> Print
            </button>
            <button
              onClick={() => router.push(`/admin/construction/progress-billing?edit=${bill._id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors"
            >
              <FaEdit size={14} /> Edit
            </button>
          </div>
        </div>

        {/* Bill Content (for print) */}
        <div ref={componentRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Company Header */}
          <div className="text-center border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">PROGRESS BILL</h2>
            <p className="text-sm text-gray-500">Tax Invoice</p>
          </div>

          {/* Bill Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bill Number</p>
              <p className="text-lg font-bold text-gray-800">{bill.billNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
              <p className="text-lg font-bold text-gray-800">
                {new Date(bill.billDate).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project</p>
              <p className="text-lg font-bold text-gray-800">{bill.project?.name || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</p>
              <p className="text-lg font-bold text-gray-800 capitalize">{bill.orderType}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {bill.orderType === "customer" ? "Customer" : "Contractor"}
              </p>
              <p className="text-lg font-bold text-gray-800">
                {bill.orderType === "customer"
                  ? bill.customer?.customerName || bill.customer?.name || "—"
                  : bill.contractor?.supplierName || bill.contractor?.name || "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
              <p className="text-lg font-bold text-gray-800 capitalize">{bill.status}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</th>
                  <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</th>
                  <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                  <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bill.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-center text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{item.description || "—"}</td>
                    <td className="px-4 py-2 text-center text-xs text-gray-600">{item.unit}</td>
                    <td className="px-4 py-2 text-center text-xs">{item.billedQuantity}</td>
                    <td className="px-4 py-2 text-center text-xs">{item.rate}</td>
                    <td className="px-4 py-2 text-right text-xs font-bold text-gray-700">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-bold text-gray-800">{formatCurrency(bill.total || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT:</span>
                  <span className="font-bold text-gray-800">{formatCurrency(bill.taxVAT || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Tax:</span>
                  <span className="font-bold text-gray-800">{formatCurrency(bill.taxService || 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                  <span className="text-gray-800">Grand Total:</span>
                  <span className="text-indigo-700">{formatCurrency(bill.grandTotal || bill.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {bill.remarks && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
              <p className="font-bold text-gray-400 uppercase tracking-wider text-xs">Remarks</p>
              <p>{bill.remarks}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}