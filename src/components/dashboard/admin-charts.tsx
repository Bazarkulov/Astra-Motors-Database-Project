"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const colors = ["#b99465", "#607b79", "#829171", "#73808a", "#a16f60"];

export function AdminCharts({ status, sales, inquiries, priceBands }: {
  status: { status: string; count: number }[];
  sales: { month: string; sales: number; revenue: number }[];
  inquiries: { status: string; count: number }[];
  priceBands: { band: string; count: number }[];
}) {
  return <div className="admin-chart-grid"><section className="admin-chart-card"><span className="eyebrow">INVENTORY BY STATUS</span><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={status} dataKey="count" nameKey="status" innerRadius={55} outerRadius={83} paddingAngle={3}>{status.map((item, index) => <Cell key={item.status} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="chart-legend">{status.map((item, index) => <span key={item.status}><i style={{ background: colors[index % colors.length] }} />{item.status} <b>{item.count}</b></span>)}</div></section>
    <section className="admin-chart-card"><span className="eyebrow">MONTHLY SALES — LAST SIX MONTHS</span><div className="chart-wrap wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={sales}><CartesianGrid stroke="#e7e7e1" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="sales" fill="#607b79" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="admin-chart-card"><span className="eyebrow">LISTINGS BY PRICE</span><div className="chart-wrap wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={priceBands}><CartesianGrid stroke="#e7e7e1" vertical={false} /><XAxis dataKey="band" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="count" fill="#b99465" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="admin-chart-card"><span className="eyebrow">INQUIRIES BY STATUS</span><div className="inquiry-bars">{inquiries.map((item, index) => <div className="inquiry-bar" key={item.status}><div><span>{item.status.replaceAll("_", " ")}</span><b>{item.count}</b></div><i><span style={{ width: `${Math.max(2, item.count / Math.max(1, ...inquiries.map((entry) => entry.count)) * 100)}%`, background: colors[index % colors.length] }} /></i></div>)}</div></section></div>;
}
