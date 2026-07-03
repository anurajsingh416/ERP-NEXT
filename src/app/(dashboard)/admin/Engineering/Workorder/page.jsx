"use client";

import React, { useState } from "react";

export default function Page() {
  const [form, setForm] = useState({
    businessUnit: "",
    financialYear: "",
    documentType: "",
    documentNo: "",
    documentDate: "",

    contractor: "",
    parentContractor: "",

    subject: "",
    scopeOfWork: "",
    remarks: "",

    commencementDate: "",
    completionDate: "",

    workType: "",
    paymentTerm: "",

    bgApplicable: false,
    foreignCurrency: false,

    dlpMonths: "",
    coChargesNominated: "",

    holdBasedOn: "",
    serviceIndentActivity: false,

    noteForApproval: "",
  });

  const inputStyle =
    "w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = () => {
    console.log(form);
    alert("Work Order Saved");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white rounded-xl shadow-lg p-6">

        <h1 className="text-2xl font-bold text-indigo-600 mb-6">
          Contractor Work Order
        </h1>

        <div className="grid md:grid-cols-2 gap-4">

          <div>
            <label className="block mb-1">Business Unit</label>
            <input
              name="businessUnit"
              value={form.businessUnit}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Financial Year</label>
            <input
              name="financialYear"
              value={form.financialYear}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Document Type</label>
            <select
              name="documentType"
              value={form.documentType}
              onChange={handleChange}
              className={inputStyle}
            >
              <option value="">Select</option>
              <option value="WO">Work Order</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Document No</label>
            <input
              name="documentNo"
              value={form.documentNo}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Document Date</label>
            <input
              type="date"
              name="documentDate"
              value={form.documentDate}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Work Type</label>
            <input
              name="workType"
              value={form.workType}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Contractor</label>
            <input
              name="contractor"
              value={form.contractor}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Parent Contractor</label>
            <input
              name="parentContractor"
              value={form.parentContractor}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1">Subject</label>
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1">Scope Of Work</label>
            <textarea
              rows={4}
              name="scopeOfWork"
              value={form.scopeOfWork}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1">Remarks</label>
            <textarea
              rows={3}
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Commencement Date</label>
            <input
              type="date"
              name="commencementDate"
              value={form.commencementDate}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Completion Date</label>
            <input
              type="date"
              name="completionDate"
              value={form.completionDate}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Payment Term</label>
            <input
              name="paymentTerm"
              value={form.paymentTerm}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">DLP In Months</label>
            <input
              type="number"
              name="dlpMonths"
              value={form.dlpMonths}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Co Charges Nominated</label>
            <input
              name="coChargesNominated"
              value={form.coChargesNominated}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block mb-1">Hold Based On</label>
            <input
              name="holdBasedOn"
              value={form.holdBasedOn}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="bgApplicable"
              checked={form.bgApplicable}
              onChange={handleChange}
            />
            <label>BG Applicable</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="foreignCurrency"
              checked={form.foreignCurrency}
              onChange={handleChange}
            />
            <label>Foreign Currency</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="serviceIndentActivity"
              checked={form.serviceIndentActivity}
              onChange={handleChange}
            />
            <label>Service Indent Activity</label>
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1">Note For Approval</label>
            <textarea
              rows={3}
              name="noteForApproval"
              value={form.noteForApproval}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSubmit}
            className="bg-green-600 text-white px-6 py-2 rounded-lg"
          >
            Save Work Order
          </button>
        </div>

      </div>
    </div>
  );
}