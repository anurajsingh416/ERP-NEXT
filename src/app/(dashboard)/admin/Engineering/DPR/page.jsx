"use client";

import React, { useState } from "react";

const defaultMaterials = [
  { material: "Cement", unit: "Bag" },
  { material: "Steel-8", unit: "Kg" },
  { material: "Steel-10", unit: "Kg" },
  { material: "Steel-12", unit: "Kg" },
  { material: "Steel-16", unit: "Kg" },
  { material: "Steel-20", unit: "Kg" },
  { material: "Steel-25", unit: "Kg" },
  { material: "Steel-30", unit: "Kg" },
  { material: "Steel-32", unit: "Kg" },
  { material: "B/wire", unit: "Kg" },
  { material: 'Brick-4"', unit: "Nos" },
  { material: 'Brick-6"', unit: "Nos" },
  { material: 'AAC Block 4"', unit: "Nos" },
  { material: 'AAC Block 6"', unit: "Nos" },
  { material: 'AAC Block 9"', unit: "Nos" },
  { material: "Metal 1", unit: "Brass" },
  { material: "Metal 2", unit: "Brass" },
  { material: "Crushed Sand", unit: "Brass" },
  { material: "", unit: "" },
  { material: "", unit: "" },
].map((m) => ({
  ...m,
  recYday: "",
  recToday: "",
  recTotal: "",
  consYday: "",
  consToday: "",
  consTotal: "",
  balance: "",
}));

export default function Page() {
  const [project, setProject] = useState("");
  const [date, setDate] = useState("");
  const [company, setCompany] = useState("");
  const [building, setBuilding] = useState("");
  const [siteInCharge, setSiteInCharge] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");

  const [manpower, setManpower] = useState([
    { contractor: "", crp: "", fitter: "", mason: "", mc: "", fc: "", helper: "", total: "" },
  ]);
  const [materials, setMaterials] = useState(defaultMaterials);
  const [activities, setActivities] = useState([
    { activity: "", qty: "", unit: "", cement: "", steel: "", bricks4: "", bricks6: "" },
  ]);
  const [workInProgress, setWorkInProgress] = useState([
    { activity: "", floorLocation: "" },
  ]);
  const [tomorrowPlan, setTomorrowPlan] = useState([
    { activity: "", floorLocation: "" },
  ]);
  const [issues, setIssues] = useState([{ description: "" }]);

  const inputStyle =
    "w-full border rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-400";

  const projectsList = [
    { id: "1", name: "Project A" },
    { id: "2", name: "Project B" },
    { id: "3", name: "Project C" },
  ];

  // Generic remove — prevents going below 1 row
  const removeRow = (setter, rows, index) => {
    if (rows.length <= 1) return;
    setter(rows.filter((_, i) => i !== index));
  };

  const addRow = (type) => {
    if (type === "manpower")
      setManpower([...manpower, { contractor: "", crp: "", fitter: "", mason: "", mc: "", fc: "", helper: "", total: "" }]);
    if (type === "materials")
      setMaterials([...materials, { material: "", unit: "", recYday: "", recToday: "", recTotal: "", consYday: "", consToday: "", consTotal: "", balance: "" }]);
    if (type === "activities")
      setActivities([...activities, { activity: "", qty: "", unit: "", cement: "", steel: "", bricks4: "", bricks6: "" }]);
    if (type === "workInProgress")
      setWorkInProgress([...workInProgress, { activity: "", floorLocation: "" }]);
    if (type === "tomorrowPlan")
      setTomorrowPlan([...tomorrowPlan, { activity: "", floorLocation: "" }]);
    if (type === "issues")
      setIssues([...issues, { description: "" }]);
  };

  const handleManpowerChange = (index, field, value) => {
    const updated = [...manpower];
    updated[index] = { ...updated[index], [field]: value };
    const row = updated[index];
    const sum = ["crp", "fitter", "mason", "mc", "fc", "helper"]
      .map((k) => parseFloat(row[k]) || 0)
      .reduce((a, b) => a + b, 0);
    updated[index].total = sum ? String(sum) : "";
    setManpower(updated);
  };

  const handleMaterialChange = (index, field, value) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    const recYday = parseFloat(updated[index].recYday) || 0;
    const recToday = parseFloat(updated[index].recToday) || 0;
    const consYday = parseFloat(updated[index].consYday) || 0;
    const consToday = parseFloat(updated[index].consToday) || 0;
    updated[index].recTotal = recYday + recToday ? String(recYday + recToday) : "";
    updated[index].consTotal = consYday + consToday ? String(consYday + consToday) : "";
    updated[index].balance =
      (recYday + recToday) || (consYday + consToday)
        ? String((recYday + recToday) - (consYday + consToday))
        : "";
    setMaterials(updated);
  };

  const updateRow = (setter, rows, index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setter(updated);
  };

  const handleSubmit = () => {
    const payload = { project, date, company, building, manpower, materials, activities, workInProgress, tomorrowPlan, issues, siteInCharge, reviewedBy };
    console.log("DPR DATA:", payload);
    alert("DPR Saved Successfully");
  };

  const DelBtn = ({ onClick }) => (
    <button
      onClick={onClick}
      className="text-red-400 hover:text-red-600 text-lg font-bold leading-none px-1"
      title="Remove row"
    >
      ×
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white rounded-xl shadow p-6">

        <h1 className="text-2xl font-bold text-indigo-600 mb-6">
          Daily Progress Report (DPR)
        </h1>

        {/* PROJECT + DATE + COMPANY + BUILDING */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block mb-1 font-medium">Project</label>
            <select className={inputStyle} value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">Select Project</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Date</label>
            <input type="date" className={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1 font-medium">Company</label>
            <input className={inputStyle} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <label className="block mb-1 font-medium">Building</label>
            <input className={inputStyle} value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Building name" />
          </div>
        </div>

        {/* WORK IN PROGRESS */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <h2 className="font-bold text-lg">Work in Progress</h2>
            <button onClick={() => addRow("workInProgress")} className="bg-indigo-600 text-white px-3 py-1 rounded">Add</button>
          </div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 w-12">Sr. No.</th>
                <th className="border p-2">Name of Activity</th>
                <th className="border p-2 w-40">Floor / Location</th>
                <th className="border p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {workInProgress.map((row, i) => (
                <tr key={i}>
                  <td className="border p-1 text-center text-gray-500 text-sm">{i + 1}</td>
                  <td className="border p-1"><input className={inputStyle} value={row.activity} onChange={(e) => updateRow(setWorkInProgress, workInProgress, i, "activity", e.target.value)} /></td>
                  <td className="border p-1"><input className={inputStyle} value={row.floorLocation} onChange={(e) => updateRow(setWorkInProgress, workInProgress, i, "floorLocation", e.target.value)} /></td>
                  <td className="border p-1 text-center"><DelBtn onClick={() => removeRow(setWorkInProgress, workInProgress, i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOMORROW'S PLAN */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <h2 className="font-bold text-lg">Tomorrow's Plan</h2>
            <button onClick={() => addRow("tomorrowPlan")} className="bg-indigo-600 text-white px-3 py-1 rounded">Add</button>
          </div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 w-12">Sr. No.</th>
                <th className="border p-2">Name of Activity</th>
                <th className="border p-2 w-40">Floor / Location</th>
                <th className="border p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {tomorrowPlan.map((row, i) => (
                <tr key={i}>
                  <td className="border p-1 text-center text-gray-500 text-sm">{i + 1}</td>
                  <td className="border p-1"><input className={inputStyle} value={row.activity} onChange={(e) => updateRow(setTomorrowPlan, tomorrowPlan, i, "activity", e.target.value)} /></td>
                  <td className="border p-1"><input className={inputStyle} value={row.floorLocation} onChange={(e) => updateRow(setTomorrowPlan, tomorrowPlan, i, "floorLocation", e.target.value)} /></td>
                  <td className="border p-1 text-center"><DelBtn onClick={() => removeRow(setTomorrowPlan, tomorrowPlan, i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ISSUES */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <h2 className="font-bold text-lg">Non-availability / Delay of Material or Other Issues</h2>
            <button onClick={() => addRow("issues")} className="bg-indigo-600 text-white px-3 py-1 rounded">Add</button>
          </div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 w-12">Sr. No.</th>
                <th className="border p-2">Description</th>
                <th className="border p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {issues.map((row, i) => (
                <tr key={i}>
                  <td className="border p-1 text-center text-gray-500 text-sm">{i + 1}</td>
                  <td className="border p-1"><input className={inputStyle} value={row.description} onChange={(e) => updateRow(setIssues, issues, i, "description", e.target.value)} /></td>
                  <td className="border p-1 text-center"><DelBtn onClick={() => removeRow(setIssues, issues, i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MANPOWER */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <h2 className="font-bold text-lg">Manpower</h2>
            <button onClick={() => addRow("manpower")} className="bg-indigo-600 text-white px-3 py-1 rounded">Add</button>
          </div>
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 w-12">Sr. No.</th>
                <th className="border p-2">Contractor</th>
                <th className="border p-2">Crp</th>
                <th className="border p-2">Fitter</th>
                <th className="border p-2">Mason</th>
                <th className="border p-2">M/C</th>
                <th className="border p-2">F/C</th>
                <th className="border p-2">Helper</th>
                <th className="border p-2">Total</th>
                <th className="border p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {manpower.map((row, i) => (
                <tr key={i}>
                  <td className="border p-1 text-center text-gray-500 text-sm">{i + 1}</td>
                  {["contractor", "crp", "fitter", "mason", "mc", "fc", "helper"].map((key) => (
                    <td key={key} className="border p-1">
                      <input className={inputStyle} value={row[key]} onChange={(e) => handleManpowerChange(i, key, e.target.value)} />
                    </td>
                  ))}
                  <td className="border p-1">
                    <input readOnly className={inputStyle + " bg-gray-50 font-semibold"} value={row.total} />
                  </td>
                  <td className="border p-1 text-center"><DelBtn onClick={() => removeRow(setManpower, manpower, i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MATERIAL STOCK */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <h2 className="font-bold text-lg">Material Stock</h2>
            <button onClick={() => addRow("materials")} className="bg-indigo-600 text-white px-3 py-1 rounded">Add</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 w-10" rowSpan={2}>Sr. No.</th>
                  <th className="border p-2" rowSpan={2}>Material</th>
                  <th className="border p-2" rowSpan={2}>Unit</th>
                  <th className="border p-2 text-center" colSpan={3}>Received</th>
                  <th className="border p-2 text-center" colSpan={3}>Consumption</th>
                  <th className="border p-2" rowSpan={2}>Stock / Balance</th>
                  <th className="border p-2 w-10" rowSpan={2}></th>
                </tr>
                <tr>
                  <th className="border p-2">Recd till Y'day</th>
                  <th className="border p-2">Today</th>
                  <th className="border p-2 bg-gray-200">Total</th>
                  <th className="border p-2">Recd till Y'day</th>
                  <th className="border p-2">Today</th>
                  <th className="border p-2 bg-gray-200">Total</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-1 text-center text-gray-500 text-sm">{i + 1}</td>
                    <td className="border p-1"><input className={inputStyle} value={row.material} onChange={(e) => handleMaterialChange(i, "material", e.target.value)} /></td>
                    <td className="border p-1"><input className={inputStyle} value={row.unit} onChange={(e) => handleMaterialChange(i, "unit", e.target.value)} /></td>
                    <td className="border p-1"><input className={inputStyle} value={row.recYday} onChange={(e) => handleMaterialChange(i, "recYday", e.target.value)} /></td>
                    <td className="border p-1"><input className={inputStyle} value={row.recToday} onChange={(e) => handleMaterialChange(i, "recToday", e.target.value)} /></td>
                    <td className="border p-1 bg-gray-50"><input readOnly className={inputStyle + " bg-transparent font-semibold"} value={row.recTotal} /></td>
                    <td className="border p-1"><input className={inputStyle} value={row.consYday} onChange={(e) => handleMaterialChange(i, "consYday", e.target.value)} /></td>
                    <td className="border p-1"><input className={inputStyle} value={row.consToday} onChange={(e) => handleMaterialChange(i, "consToday", e.target.value)} /></td>
                    <td className="border p-1 bg-gray-50"><input readOnly className={inputStyle + " bg-transparent font-semibold"} value={row.consTotal} /></td>
                    <td className="border p-1 bg-gray-50"><input readOnly className={inputStyle + " bg-transparent font-semibold"} value={row.balance} /></td>
                    <td className="border p-1 text-center"><DelBtn onClick={() => removeRow(setMaterials, materials, i)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MATERIAL CONSUMPTION */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <h2 className="font-bold text-lg">Material Consumption</h2>
            <button onClick={() => addRow("activities")} className="bg-indigo-600 text-white px-3 py-1 rounded">Add</button>
          </div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 w-12">Sr. No.</th>
                <th className="border p-2">Activity</th>
                <th className="border p-2">Qty</th>
                <th className="border p-2">Unit</th>
                <th className="border p-2">Cement</th>
                <th className="border p-2">Steel</th>
                <th className="border p-2">Bricks 4"</th>
                <th className="border p-2">Bricks 6"</th>
                <th className="border p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {activities.map((row, i) => (
                <tr key={i}>
                  <td className="border p-1 text-center text-gray-500 text-sm">{i + 1}</td>
                  {Object.keys(row).map((key) => (
                    <td key={key} className="border p-1">
                      <input className={inputStyle} value={row[key]} onChange={(e) => updateRow(setActivities, activities, i, key, e.target.value)} />
                    </td>
                  ))}
                  <td className="border p-1 text-center"><DelBtn onClick={() => removeRow(setActivities, activities, i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SIGNATURES */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block mb-1 font-medium">Site In Charge</label>
            <input className={inputStyle} value={siteInCharge} onChange={(e) => setSiteInCharge(e.target.value)} placeholder="Name" />
          </div>
          <div>
            <label className="block mb-1 font-medium">Reviewed By</label>
            <input className={inputStyle} value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} placeholder="Name" />
          </div>
        </div>

        {/* SAVE */}
        <div className="flex justify-end">
          <button onClick={handleSubmit} className="bg-green-600 text-white px-6 py-2 rounded-lg">
            Save DPR
          </button>
        </div>
      </div>
    </div>
  );
}
