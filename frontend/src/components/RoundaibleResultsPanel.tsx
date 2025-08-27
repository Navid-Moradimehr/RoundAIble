import React from 'react';
import JSZip from 'jszip';

interface CodeFile {
  filename: string;
  content: string;
}
interface CodeResult {
  agent?: string;
  code_id?: string;
  codes?: CodeFile[];
  description?: string;
  scores?: any;
  avgScore?: number;
  rationales?: string[];
}
interface LiveChatMessage {
  sender: string;
  content: string;
  timestamp: string;
}
interface RoundaibleResult {
  codeResults?: CodeResult[];
  liveChatMessages?: LiveChatMessage[];
  winner?: string;
  scores?: any;
  rationales?: any;
}

interface Props {
  roundaibleResult: RoundaibleResult | null;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function exportAsJSON(data: any, filename = 'results.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stripCodeBlock(content: string) {
  // Remove triple backticks and language if present
  return content.replace(/^```[a-zA-Z]*\n?|```$/gm, '');
}

function downloadCodeFiles(codeResults: CodeResult[], specificAgent?: string) {
  if (!codeResults || codeResults.length === 0) return;
  
  let targetResults = codeResults;
  if (specificAgent) {
    targetResults = codeResults.filter(r => (r.agent || r.code_id) === specificAgent);
  }
  
  // Gather code files from target agents
  const allFiles: CodeFile[] = [];
  targetResults.forEach(r => {
    if (r.codes && r.codes.length > 0) {
      r.codes.forEach(c => allFiles.push(c));
    }
  });
  
  if (allFiles.length === 0) return;
  
  if (allFiles.length === 1) {
    // Single file: download directly
    const file = allFiles[0];
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename || 'code.txt';
    a.click();
    URL.revokeObjectURL(url);
  } else {
    // Multiple files: zip and download
    const zip = new JSZip();
    allFiles.forEach(file => {
      zip.file(file.filename || 'code.txt', file.content);
    });
    zip.generateAsync({ type: 'blob' }).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = specificAgent ? `${specificAgent}_code.zip` : 'code.zip';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

export default function RoundaibleResultsPanel({ roundaibleResult }: any) {
  if (!roundaibleResult) return <div style={{ padding: 16, color: '#888' }}>No results yet.</div>;
  const { codeResults, liveChatMessages, winner, scores, rationales } = roundaibleResult;
  
  // Debug logging
  console.log('🚀 Frontend: Received roundaibleResult:', roundaibleResult);
  console.log('🚀 Frontend: codeResults:', codeResults);
  if (codeResults && codeResults.length > 0) {
    codeResults.forEach((r: any, idx: number) => {
      console.log(`🚀 Frontend: Code ${idx + 1} (${r.code_id}):`, {
        avgScore: r.avgScore,
        scores: r.scores,
        rationales: r.rationales,
        critiques: r.critiques
      });
    });
  }

  return (
    <div style={{
      padding: 8,
      background: '#fff',
      borderRadius: 10,
      margin: 6,
      maxWidth: 350,
      minWidth: 120,
      minHeight: 220,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 2px 8px rgba(16,163,127,0.08)',
      fontSize: 14,
      border: '1.5px solid #e0e0e0',
      overflow: 'hidden',
      flex: 1
    }}>
      {/* Top: Live Chat */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 0, borderBottom: '2px solid #e0e0e0', paddingBottom: 8, minHeight: 0 }}>
        <div style={{ fontWeight: 800, marginBottom: 4, fontSize: 15, color: '#1A73E8', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, marginRight: 6 }}>💬</span> Live Chat
        </div>
        {liveChatMessages && liveChatMessages.length > 0 ? (
          <div style={{ maxHeight: '100%', overflowY: 'auto', background: '#f8faff', borderRadius: 6, padding: 6, border: '1px solid #e0e0e0' }}>
            {liveChatMessages.map((msg: any, i: number) => (
              <div key={i} style={{ marginBottom: 6, padding: 4, borderRadius: 4, background: msg.role === 'critic' ? '#fff3cd' : msg.role === 'reasoning' ? '#d1ecf1' : '#f8f9fa', border: `1px solid ${msg.role === 'critic' ? '#ffeaa7' : msg.role === 'reasoning' ? '#bee5eb' : '#e9ecef'}` }}>
                <span style={{ fontWeight: 500, color: msg.role === 'critic' ? '#856404' : msg.role === 'reasoning' ? '#0c5460' : '#495057' }}>{msg.sender}</span> <span style={{ color: '#888', fontSize: 12 }}>({msg.role})</span>
                <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 13, marginTop: 2 }}>{msg.content}</div>
                <div style={{ color: '#aaa', fontSize: 11, textAlign: 'right', marginTop: 2 }}>{msg.timestamp}</div>
              </div>
            ))}
            <button className="btn btn-sm btn-outline-secondary" style={{ marginTop: 4, fontSize: 12, padding: '3px 8px' }} onClick={() => copyToClipboard(liveChatMessages.map((m: any) => `${m.sender}: ${m.content}`).join('\n'))}>Copy Chat</button>
          </div>
        ) : <div style={{ color: '#aaa', fontSize: 13 }}>No chat messages.</div>}
      </div>
      {/* Bottom: Final Results and Export */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, minHeight: 0 }}>
        <div style={{ fontWeight: 700, margin: '6px 0 4px 0', fontSize: 15, color: '#10A37F', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, marginRight: 6 }}>🏆</span> Final Results
        </div>
        {codeResults && codeResults.length > 0 ? (
          <div style={{ background: '#f8fff8', borderRadius: 6, padding: 8, border: '1px solid #e0e0e0' }}>
            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: '#10A37F' }}>Winner:</span>
              <span style={{ fontWeight: 700, color: '#1976d2', fontSize: 15 }}>{winner || <span style={{ color: '#aaa' }}>None</span>}</span>
              <button className="btn btn-sm btn-outline-secondary" style={{ marginLeft: 'auto', fontSize: 12, padding: '3px 8px' }} onClick={() => copyToClipboard(JSON.stringify(codeResults, null, 2))}>Copy Results</button>
              <button className="btn btn-sm btn-outline-primary" style={{ fontSize: 12, padding: '3px 8px' }} onClick={() => downloadCodeFiles(codeResults)}>Download All</button>
            </div>
            <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 13 }}>Voting Results:</div>
            {codeResults.map((r: any, idx: number) => (
              <div key={idx} style={{ marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                <div style={{ fontWeight: 600, color: '#333', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{r.agent || r.code_id || `Code ${idx + 1}`} {winner === (r.code_id || r.agent) && <span style={{ color: '#10A37F', fontWeight: 700 }}>🏆</span>}</span>
                  <button className="btn btn-sm btn-outline-success" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => downloadCodeFiles(codeResults, r.agent || r.code_id)}>Download</button>
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  Score: <b>
                    {typeof r.avgScore === 'number' ? r.avgScore.toFixed(2) : 
                     typeof r.score === 'number' ? r.score.toFixed(2) :
                     r.scores && r.scores.length > 0 ? (r.scores.reduce((a: number, b: number) => a + b, 0) / r.scores.length).toFixed(2) : 
                     '-'}
                  </b> 
                  {r.scores && r.scores.length > 0 ? <span>({r.scores.join(', ')})</span> : <span style={{ color: '#bbb' }}>No scores</span>}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>Rationales: {r.rationales && r.rationales.length > 0 ? r.rationales.map((rat: string, i: number) => <div key={i} style={{ marginLeft: 10, fontSize: 11, color: '#666' }}>- {rat}</div>) : <span style={{ color: '#bbb' }}>No rationales</span>}</div>
                <div style={{ fontSize: 12, color: '#888' }}>Critiques: {r.critiques && r.critiques.length > 0 ? r.critiques.map((crit: string, i: number) => <div key={i} style={{ marginLeft: 10, fontSize: 11, color: '#666', fontStyle: 'italic' }}>- {crit}</div>) : <span style={{ color: '#bbb' }}>No critiques</span>}</div>
                {r.codes && r.codes.length > 0 && r.codes.map((c: any, i: number) => (
                  <div key={i} style={{ marginTop: 4, marginBottom: 4 }}>
                    <div style={{ fontWeight: 500, fontSize: 12, color: '#1976d2', marginBottom: 2 }}>{c.filename}
                      <button className="btn btn-sm btn-outline-secondary" style={{ marginLeft: 8, fontSize: 11, padding: '2px 7px' }} onClick={() => copyToClipboard(stripCodeBlock(c.content))}>Copy</button>
                    </div>
                    <pre style={{ background: '#f5f5f5', borderRadius: 4, padding: 8, fontSize: 12, margin: 0, overflowX: 'auto', border: '1px solid #eee' }}>{stripCodeBlock(c.content)}</pre>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{r.description}</div>
              </div>
            ))}
          </div>
        ) : <div style={{ color: '#aaa', fontSize: 13 }}>No code results.</div>}
      </div>
    </div>
  );
} 