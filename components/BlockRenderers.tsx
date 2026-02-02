import React from 'react';
import { MoreHorizontal, Calendar as CalendarIcon, Link2, Play, Grid, List, Table as TableIcon, Layout } from 'lucide-react';
import { Block } from '../types';

// Mock Data for Databases
const dbData = [
  { id: 1, name: 'Analisi Competitor', status: 'In Corso', tag: 'Marketing', date: '12 Ott' },
  { id: 2, name: 'Design System', status: 'Fatto', tag: 'Design', date: '05 Nov' },
  { id: 3, name: 'Interviste Utenti', status: 'Da Fare', tag: 'Ricerca', date: '20 Nov' },
];

export const BlockRenderer: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.type) {
    // --- BASIC TEXT BLOCKS ---
    case 'h1':
      return <h1 className="text-3xl font-bold text-slate-800 mt-6 mb-2">{block.content}</h1>;
    case 'h2':
      return <h2 className="text-2xl font-semibold text-slate-800 mt-5 mb-2 border-b border-slate-100 pb-1">{block.content}</h2>;
    case 'h3':
      return <h3 className="text-xl font-medium text-slate-800 mt-4 mb-2">{block.content}</h3>;
    case 'text':
      return <p className="text-slate-600 leading-relaxed mb-2 min-h-[1.5rem]">{block.content}</p>;
    case 'divider':
      return <hr className="my-6 border-slate-200" />;
    case 'bullet':
      return <li className="text-slate-600 ml-4 list-disc mb-1">{block.content}</li>;
    
    // --- ADVANCED BLOCKS ---
    case 'callout':
      return (
        <div className="bg-pastel-cyan/30 p-4 rounded-xl flex gap-3 my-4 border border-cyan-100">
          <span className="text-xl">💡</span>
          <p className="text-slate-700 font-medium">{block.content}</p>
        </div>
      );
    case 'toc':
      return (
        <div className="bg-slate-50 p-4 rounded-xl mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">INDICE</p>
          <ul className="space-y-1 text-sm text-indigo-600">
            <li><a href="#" className="hover:underline">1. Introduzione</a></li>
            <li><a href="#" className="hover:underline">2. Analisi di Mercato</a></li>
            <li><a href="#" className="hover:underline">3. Strategia</a></li>
          </ul>
        </div>
      );

    // --- EMBEDS ---
    case 'embed_maps':
      return (
        <div className="my-4 rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-64 bg-slate-100 relative group">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2798.949796165441!2d9.185924315812498!3d45.46542197910096!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c6aec34636a1%3A0xab7f4e27101a2e5d!2sDuomo%20di%20Milano!5e0!3m2!1sit!2sit!4v1625667000000!5m2!1sit!2sit" 
            className="w-full h-full border-0" 
            loading="lazy"
          ></iframe>
        </div>
      );
    case 'embed_figma':
      return (
        <div className="my-4 rounded-2xl overflow-hidden border border-slate-200 bg-[#2C2C2C] h-96 flex flex-col items-center justify-center relative">
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg" className="w-16 h-16 opacity-50 mb-4" />
          <p className="text-slate-400 font-medium">Anteprima Prototipo Figma</p>
          <p className="text-xs text-slate-500 mt-2">{block.properties?.url || 'Design System v2.0'}</p>
          <button className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition">Apri in Figma</button>
        </div>
      );
    case 'embed_youtube':
       return (
        <div className="my-4 rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-black">
           <iframe 
             className="w-full h-full" 
             src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
             title="YouTube video player" 
             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
             allowFullScreen
            ></iframe>
        </div>
       );

    // --- DATABASE VIEWS ---
    case 'db_table':
      return (
        <div className="my-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
             <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                <TableIcon size={16} className="text-indigo-500" /> Database: Task Principali
             </div>
             <MoreHorizontal size={16} className="text-slate-400" />
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Nome Task</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {dbData.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'Fatto' ? 'bg-pastel-green text-green-800' : 'bg-pastel-orange text-orange-800'}`}>{row.status}</span></td>
                  <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{row.tag}</span></td>
                  <td className="px-4 py-3 text-slate-500">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100 hover:bg-slate-50 cursor-pointer flex items-center gap-1">
             + Nuovo
          </div>
        </div>
      );

    case 'db_gallery':
      return (
        <div className="my-6">
          <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
             <Layout size={16} /> Vista Galleria
          </div>
          <div className="grid grid-cols-3 gap-4">
             {dbData.map((item) => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer">
                   <div className="h-20 bg-slate-100 rounded-lg mb-3 w-full object-cover overflow-hidden relative">
                      {/* Placeholder for cover image */}
                      <div className={`absolute inset-0 opacity-50 ${item.id === 1 ? 'bg-pastel-pink' : item.id === 2 ? 'bg-pastel-cyan' : 'bg-pastel-peach'}`}></div>
                   </div>
                   <h4 className="font-bold text-slate-800 text-sm mb-1">{item.name}</h4>
                   <p className="text-xs text-slate-500">{item.tag}</p>
                </div>
             ))}
             <div className="border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 cursor-pointer">
                + Nuovo
             </div>
          </div>
        </div>
      );

    default:
      return <div className="p-4 bg-red-50 text-red-500 rounded border border-red-200">Blocco non supportato: {block.type}</div>;
  }
};