"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaRobot, FaTimes, FaKey, FaSave } from "react-icons/fa";

export default function AISettingsModal({ isOpen, onClose }) {
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [maskedKey, setMaskedKey] = useState("");

    useEffect(() => {
        if (!isOpen) return;

        const fetchSettings = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await fetch("/api/ai-key", { // adjust path to your route
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setIsConfigured(Boolean(data.isConfigured));
                    setMaskedKey(data.maskedKey || "");
                }
            } catch (err) {
                console.error("Failed to load AI settings:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const res = await api.put(
                "/ai-key",
                { anthropicApiKey: apiKey },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.success) {
                toast.success("Anthropic AI Settings updated!");
                onClose();
            } else {
                toast.error(res.data?.message || "Failed to update AI settings");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Error updating settings");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                            <FaRobot size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-sm font-black text-gray-900">AI Integration Settings</h3>

                                {loading ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                        Checking...
                                    </span>
                                ) : isConfigured ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Configured {maskedKey ? `(${maskedKey})` : ""}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        Not Configured
                                    </span>
                                )}
                            </div>
                            {/* <h3 className="text-sm font-black text-gray-900">AI Integration Settings</h3> */}
                            <p className="text-[11px] text-gray-400">Configure Anthropic Claude API for BOQ proofreading</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">
                        <FaTimes size={16} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="mt-4 space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <FaKey className="text-purple-500" size={12} /> Anthropic API Key
                        </label>
                        <input
                            type="password"
                            placeholder="sk-ant-api03-..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            disabled={loading}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Used across all projects for technical typo fixes and Item Master standardizations.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-all shadow-md shadow-purple-100 disabled:opacity-50"
                        >
                            <FaSave size={12} /> {saving ? "Saving..." : "Save Key"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}