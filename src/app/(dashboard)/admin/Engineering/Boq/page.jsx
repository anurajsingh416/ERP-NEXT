"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FaPlus, FaTrash, FaSave } from "react-icons/fa";

export default function Page() {
  const [boqNumber, setBoqNumber] = useState("");
  const [title, setTitle] = useState("");

  // Project Dropdown
  const [project, setProject] = useState("");
  const [projects, setProjects] = useState([]);

  const [revision, setRevision] = useState("R0");
  const [status, setStatus] = useState("Draft");

  const [items, setItems] = useState([
    {
      itemCode: "",
      description: "",
      unit: "",
      quantity: "",
      rate: "",
    },
  ]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await api.get("/project/projects", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setProjects(res.data || []);
      } catch (err) {
        console.log(err);
      }
    };

    fetchProjects();
  }, []);


  const inputClass =
    "w-full px-3 py-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  const addRow = () => {
    setItems([
      ...items,
      {
        itemCode: "",
        description: "",
        unit: "",
        quantity: "",
        rate: "",
      },
    ]);
  };

  const removeRow = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const grandTotal = items.reduce((total, item) => {
    return (
      total +
      Number(item.quantity || 0) * Number(item.rate || 0)
    );
  }, 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      boqNumber,
      title,
      project,
      revision,
      status,
      items: items.map((item) => ({
        ...item,
        amount:
          Number(item.quantity || 0) *
          Number(item.rate || 0),
      })),
      grandTotal,
    };

    console.log("BOQ DATA:", payload);

    alert("BOQ Saved Successfully");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-md">
        {/* Header */}
        <div className="border-b p-6">
          <h1 className="text-2xl font-bold text-indigo-600">
            Bill Of Quantity (BOQ)
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* BOQ Details */}
          <div>
            <h2 className="text-lg font-semibold text-indigo-500 mb-4">
              BOQ Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm mb-1">
                  BOQ Number
                </label>
                <input
                  className={inputClass}
                  value={boqNumber}
                  onChange={(e) =>
                    setBoqNumber(e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Title
                </label>
                <input
                  className={inputClass}
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  required
                />
              </div>

            <div>
  <label className="block text-sm mb-1">
    Project
  </label>

  <select
    className={inputClass}
    value={project}
    onChange={(e) => setProject(e.target.value)}
  >
    <option value="">
      Select Project
    </option>

    {projects.map((p) => (
      <option
        key={p._id}
        value={p._id}
      >
        {p.name}
      </option>
    ))}
  </select>
</div>

              <div>
                <label className="block text-sm mb-1">
                  Revision
                </label>
                <input
                  className={inputClass}
                  value={revision}
                  onChange={(e) =>
                    setRevision(e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Status
                </label>
                <select
                  className={inputClass}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value)
                  }
                >
                  <option value="Draft">Draft</option>
                  <option value="Approved">
                    Approved
                  </option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* BOQ Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-indigo-500">
                BOQ Items
              </h2>

              <button
                type="button"
                onClick={addRow}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaPlus />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                <tr>
                 <th className="p-3 text-center">
                   Sr No
                    </th>

                 <th className="p-3 text-left">
                  Particular
                  </th>

                    <th className="p-3 text-left">
                      Description
                    </th>
                    <th className="p-3 text-left">
                      Unit
                    </th>
                    <th className="p-3 text-left">
                      Quantity
                    </th>
                    <th className="p-3 text-left">
                      Rate
                    </th>
                    <th className="p-3 text-left">
                      Amount
                    </th>
                    <th className="p-3 text-center">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const amount =
                      Number(item.quantity || 0) *
                      Number(item.rate || 0);

                    return (
  <tr
    key={index}
    className="border-t"
  >
    <td className="p-2 text-center font-semibold">
      {index + 1}
    </td>

    <td className="p-2">
      <input
        className={inputClass}
        value={item.itemCode}
        onChange={(e) =>
          updateItem(
            index,
            "itemCode",
            e.target.value
          )
        }
      />
    </td>
                  

                        <td className="p-2">
                          <input
                            className={inputClass}
                            value={item.description}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="p-2">
                          <input
                            className={inputClass}
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unit",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            className={inputClass}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            className={inputClass}
                            value={item.rate}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "rate",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="p-2 font-semibold">
                          ₹{amount.toLocaleString()}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              removeRow(index)
                            }
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="bg-indigo-50 border-t">
                   <td
                     colSpan={6}
                      className="p-4 text-right font-bold"
                       >
                      Grand Total
                    </td>

                    <td
                      colSpan={2}
                      className="p-4 font-bold text-indigo-600"
                    >
                      ₹{grandTotal.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
            >
              <FaSave />
              Save BOQ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}