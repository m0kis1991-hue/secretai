'use client'
import { useState, useEffect, useRef } from "react";
import styles from './SecretaryApp.module.css'

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function callClaude(messages, systemPrompt = "") {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system: systemPrompt }),
  });
  const data = await res.json();
  return data.text || "";
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleEmails = [
  { id: 1, from: "Γιώργος Παπαδόπουλος", email: "g.papa@techco.gr", subject: "Πρόταση συνεργασίας Q2", date: "Σήμερα, 10:24", body: "Καλημέρα,\n\nΘα ήθελα να συζητήσουμε μια πιθανή συνεργασία για το επόμενο τρίμηνο. Έχετε διαθεσιμότητα για μια σύντομη τηλεδιάσκεψη;\n\nΜε εκτίμηση,\nΓιώργος", unread: true },
  { id: 2, from: "Μαρία Αντωνίου", email: "m.antoniou@consulting.gr", subject: "Μελέτη Εγκατάστασης – Αναθεώρηση", date: "Χθες, 16:42", body: "Αγαπητέ Αλέξανδρε,\n\nΣας αποστέλλω αναθεωρημένη έκδοση της μελέτης. Παρακαλώ ελέγξτε τις αλλαγές στο κεφάλαιο 3 και ενημερώστε με.\n\nΦιλικά,\nΜαρία", unread: true },
  { id: 3, from: "ΤΕΧΝΙΚΟ ΕΠΙΜΕΛΗΤΗΡΙΟ", email: "info@tee.gr", subject: "Ανανέωση συνδρομής 2025", date: "Τετ, 09:00", body: "Αγαπητέ μέλος,\n\nΣας υπενθυμίζουμε ότι η συνδρομή σας για το 2025 λήγει στις 31/03. Παρακαλώ ανανεώστε έγκαιρα.", unread: false },
];

const sampleEvents = [
  { id: 1, title: "Συνάντηση με πελάτη", time: "09:00", location: "Κεντρικά Γραφεία", address: "Λεωφ. Κηφισίας 12, Αθήνα", color: "gold" },
  { id: 2, title: "Αυτοψία κτιρίου", time: "11:30", location: "Πειραιάς – Έργο Β", address: "Λιμάνι Πειραιά, Αποθήκη Δ4", color: "blue" },
  { id: 3, title: "Μελέτη HVAC", time: "14:00", location: "Κεντρικά Γραφεία", address: "Λεωφ. Κηφισίας 12, Αθήνα", color: "gold" },
  { id: 4, title: "Επιθεώρηση εργοταξίου", time: "09:30", location: "Γλυφάδα – Έργο Α", address: "Ποσειδώνος 45, Γλυφάδα", color: "green" },
  { id: 5, title: "Τεχνική παρουσίαση", time: "16:00", location: "Γλυφάδα – Έργο Α", address: "Ποσειδώνος 45, Γλυφάδα", color: "green" },
];

const sampleDocs = [
  { id: 1, title: "Τεχνική Έκθεση – Έργο Β", meta: "Σήμερα", content: "ΤΕΧΝΙΚΗ ΕΚΘΕΣΗ\nΈργο: Πειραιάς – Αποθήκη Δ4\n\nΠΕΡΙΛΗΨΗ\nΑξιολόγηση κτιρίου αποθήκης Δ4 στο λιμάνι Πειραιά.\n\nΕΥΡΗΜΑΤΑ\n• Ηλεκτρολογικές εγκαταστάσεις: καλή κατάσταση\n• Υδραυλικό δίκτυο: χρήζει αντικατάστασης\n• Πυρασφάλεια: απαιτείται ενημέρωση" },
  { id: 2, title: "Πρόταση Συνεργασίας Q2", meta: "Χθες", content: "ΠΡΟΤΑΣΗ ΣΥΝΕΡΓΑΣΙΑΣ\n\nΑγαπητοί συνεργάτες,\n\nΘα θέλαμε να σας παρουσιάσουμε την πρότασή μας για τη συνεργασία του δεύτερου τριμήνου 2025..." },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmailTab() {
  const [selected, setSelected] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = sampleEmails.filter(e =>
    e.from.toLowerCase().includes(search.toLowerCase()) ||
    e.subject.toLowerCase().includes(search.toLowerCase())
  );

  const generateReply = async () => {
    if (!selected || !instruction) return;
    setLoading(true); setAiReply("");
    const reply = await callClaude([{
      role: "user",
      content: `Email από: ${selected.from}\nΘέμα: ${selected.subject}\nΠεριεχόμενο:\n${selected.body}\n\nΟδηγία: ${instruction}\n\nΓράψε επαγγελματική απάντηση στα ελληνικά.`
    }], "Είσαι επαγγελματίας γραμματέας. Γράφεις emails στα ελληνικά, ευγενικά και δομημένα. Γράφε μόνο το σώμα του email.");
    setAiReply(reply);
    setLoading(false);
  };

  return (
    <div className={styles.emailPanel}>
      <div className={styles.emailList}>
        <div className={styles.panelLabel}>Εισερχόμενα</div>
        <input className={styles.searchInput} placeholder="Αναζήτηση..." value={search} onChange={e => setSearch(e.target.value)} />
        {filtered.map(email => (
          <div key={email.id}
            className={`${styles.emailCard} ${email.unread ? styles.unread : ''} ${selected?.id === email.id ? styles.activeCard : ''}`}
            onClick={() => { setSelected(email); setAiReply(""); setInstruction(""); }}>
            <div className={styles.emailFrom}>{email.unread && <span className={styles.unreadDot}/>}{email.from}</div>
            <div className={styles.emailSubject}>{email.subject}</div>
            <div className={styles.emailDate}>{email.date}</div>
          </div>
        ))}
      </div>

      <div className={styles.emailMain}>
        {selected ? (<>
          <div className={styles.emailView}>
            <div className={styles.emailViewHeader}>
              <div className={styles.emailViewSubject}>{selected.subject}</div>
              <div className={styles.emailViewMeta}>Από: {selected.from} · {selected.date}</div>
            </div>
            <div className={styles.emailViewBody}>{selected.body}</div>
          </div>
          <div className={styles.composeBox}>
            <div className={styles.panelLabel}>AI Απάντηση</div>
            <div className={styles.composeRow}>
              <textarea className={styles.composeInput} rows={2}
                placeholder='π.χ. "Αποδέξου τη συνάντηση για Παρασκευή"...'
                value={instruction} onChange={e => setInstruction(e.target.value)} />
              <button className={styles.btnPrimary} onClick={generateReply} disabled={loading || !instruction}>
                {loading ? "⏳" : "✨"} Δημιούργησε
              </button>
            </div>
            {loading && <div className={styles.typingRow}><span className={styles.dot}/><span className={styles.dot}/><span className={styles.dot}/></div>}
            {aiReply && (
              <div className={styles.aiBox}>
                <div className={styles.aiBoxLabel}>✦ Προτεινόμενη Απάντηση</div>
                <div className={styles.aiBoxText}>{aiReply}</div>
                <div className={styles.aiBoxActions}>
                  <button className={styles.btnPrimary} onClick={() => navigator.clipboard.writeText(aiReply)}>📋 Αντιγραφή</button>
                  <button className={styles.btnGhost} onClick={() => setAiReply("")}>✕ Απόρριψη</button>
                </div>
              </div>
            )}
          </div>
        </>) : (
          <div className={styles.emptyState}><div className={styles.emptyIcon}>📬</div><p>Επίλεξε ένα email</p></div>
        )}
      </div>
    </div>
  );
}

function ScheduleTab() {
  const [events, setEvents] = useState(sampleEvents);
  const [newEv, setNewEv] = useState({ title: "", time: "", location: "", address: "" });
  const [aiSug, setAiSug] = useState("");
  const [loading, setLoading] = useState(false);

  const grouped = events.reduce((acc, ev) => {
    if (!acc[ev.location]) acc[ev.location] = { address: ev.address, events: [], color: ev.color };
    acc[ev.location].events.push(ev);
    return acc;
  }, {});

  const locIcons = { "Κεντρικά Γραφεία": "🏢", "Πειραιάς – Έργο Β": "🚢", "Γλυφάδα – Έργο Α": "🏗️" };

  const addEvent = () => {
    if (!newEv.title || !newEv.time || !newEv.location) return;
    setEvents([...events, { ...newEv, id: Date.now(), color: "blue" }]);
    setNewEv({ title: "", time: "", location: "", address: "" });
  };

  const optimizeRoute = async () => {
    setLoading(true);
    const evList = events.map(e => `${e.time} - ${e.title} @ ${e.location}`).join("\n");
    const res = await callClaude([{ role: "user", content: `Δραστηριότητες:\n${evList}\n\nΔώσε σύντομες συμβουλές βελτιστοποίησης διαδρομής (2-3 παράγραφοι, στα ελληνικά).` }]);
    setAiSug(res);
    setLoading(false);
  };

  const colorMap = { gold: "#d4af5f", blue: "#6baed6", green: "#74c476" };

  return (
    <div className={styles.schedulePanel}>
      <div className={styles.scheduleLeft}>
        <div className={styles.panelLabel}>Πρόγραμμα ανά Τοποθεσία</div>
        {Object.entries(grouped).map(([loc, data]) => (
          <div key={loc} className={styles.locationGroup}>
            <div className={styles.locHeader}>
              <div className={styles.locIcon}>{locIcons[loc] || "📍"}</div>
              <div>
                <div className={styles.locName}>{loc}</div>
                <div className={styles.locAddress}>{data.address}</div>
              </div>
            </div>
            <div className={styles.locEvents}>
              {data.events.sort((a,b)=>a.time.localeCompare(b.time)).map(ev => (
                <div key={ev.id} className={styles.locEvent} style={{borderLeftColor: colorMap[ev.color] || "#d4af5f"}}>
                  <div className={styles.locTime}>{ev.time}</div>
                  <div className={styles.locTitle}>{ev.title}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {aiSug && <div className={styles.aiBox}><div className={styles.aiBoxLabel}>🗺️ AI Βελτιστοποίηση</div><div className={styles.aiBoxText}>{aiSug}</div></div>}
        <button className={styles.btnPrimary} onClick={optimizeRoute} disabled={loading}>
          {loading ? "⏳ Ανάλυση..." : "🗺️ Βελτιστοποίηση Διαδρομής"}
        </button>
      </div>

      <div className={styles.scheduleRight}>
        <div className={styles.addEventForm}>
          <div className={styles.panelLabel}>Νέο Event</div>
          {[["Τίτλος","title","π.χ. Αυτοψία"],["Ώρα","time","","time"],["Τοποθεσία","location","π.χ. Γραφεία"],["Διεύθυνση","address","Οδός, Πόλη"]].map(([label, key, ph, type]) => (
            <div key={key} className={styles.formField}>
              <div className={styles.formLabel}>{label}</div>
              <input type={type||"text"} className={styles.formInput} placeholder={ph}
                value={newEv[key]} onChange={e => setNewEv({...newEv, [key]: e.target.value})} />
            </div>
          ))}
          <button className={`${styles.btnPrimary} ${styles.fullWidth}`} onClick={addEvent}>+ Προσθήκη</button>
        </div>
      </div>
    </div>
  );
}

function DocsTab() {
  const [docs, setDocs] = useState(sampleDocs);
  const [selected, setSelected] = useState(docs[0]);
  const [content, setContent] = useState(docs[0].content);
  const [title, setTitle] = useState(docs[0].title);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  const selectDoc = (doc) => { setSelected(doc); setContent(doc.content); setTitle(doc.title); };

  const generateDoc = async () => {
    if (!instruction) return;
    setLoading(true);
    const res = await callClaude([{
      role: "user",
      content: `Εντολή: ${instruction}\n\nΤρέχον περιεχόμενο:\n${content}`
    }], "Είσαι γραμματέας που δημιουργεί επαγγελματικά έγγραφα στα ελληνικά. Γράφε δομημένα και επαγγελματικά.");
    setContent(res);
    setLoading(false);
    setInstruction("");
  };

  const newDoc = () => {
    const doc = { id: Date.now(), title: "Νέο Έγγραφο", meta: "Μόλις", content: "" };
    setDocs([doc, ...docs]);
    selectDoc(doc);
  };

  return (
    <div className={styles.docsPanel}>
      <div className={styles.docSidebar}>
        <div className={styles.panelLabel}>Έγγραφα</div>
        <button className={`${styles.btnPrimary} ${styles.smallBtn}`} onClick={newDoc}>+ Νέο</button>
        {docs.map(doc => (
          <div key={doc.id} className={`${styles.docItem} ${selected?.id === doc.id ? styles.activeCard : ''}`} onClick={() => selectDoc(doc)}>
            <div className={styles.docTitle}>{doc.title}</div>
            <div className={styles.docMeta}>{doc.meta}</div>
          </div>
        ))}
      </div>
      <div className={styles.docEditor}>
        <div className={styles.docToolbar}>
          <input className={styles.docTitleInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="Τίτλος..." />
          <button className={styles.btnGhost} onClick={() => navigator.clipboard.writeText(content)}>📋</button>
        </div>
        <div className={styles.composeRow}>
          <input className={styles.formInput} style={{flex:1}}
            placeholder='AI εντολή: "Πρόσθεσε συμπεράσματα" / "Βελτίωσε ύφος"...'
            value={instruction} onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => e.key==="Enter" && generateDoc()} />
          <button className={styles.btnPrimary} onClick={generateDoc} disabled={loading||!instruction}>
            {loading ? "⏳" : "✨"} AI
          </button>
        </div>
        {loading && <div className={styles.typingRow}><span className={styles.dot}/><span className={styles.dot}/><span className={styles.dot}/><span className={styles.typingText}>Το AI γράφει...</span></div>}
        <textarea className={styles.docTextarea} value={content} onChange={e => setContent(e.target.value)} placeholder="Γράψε ή ζήτα από το AI να δημιουργήσει περιεχόμενο..." />
      </div>
    </div>
  );
}

function AssistantTab() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Καλημέρα! Είμαι ο AI Γραμματέας σου. Μπορώ να σε βοηθήσω με emails, έγγραφα και οργάνωση προγράμματος. Πώς μπορώ να σε εξυπηρετήσω;" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const historyRef = useRef([]);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    historyRef.current = [...historyRef.current, { role: "user", content: msg }];
    const reply = await callClaude(historyRef.current, "Είσαι επαγγελματίας AI Γραμματέας. Απαντάς στα ελληνικά, είσαι ευγενικός, οργανωτικός και αποτελεσματικός. Βοηθάς με emails, έγγραφα και διαχείριση προγράμματος.");
    historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
    setMessages(prev => [...prev, { role: "ai", text: reply }]);
    setLoading(false);
  };

  const quickCmds = ["Βοήθεια με email", "Δημιούργησε έκθεση", "Οργάνωσε πρόγραμμα", "Σύνταξε πρόταση"];

  return (
    <div className={styles.chatPanel}>
      <div className={styles.panelLabel}><span className={styles.onlineDot}/>AI Γραμματέας · Ενεργός</div>
      <div className={styles.chatMessages}>
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.chatMsg} ${msg.role === "user" ? styles.userMsg : ""}`}>
            <div className={`${styles.chatAvatar} ${msg.role === "ai" ? styles.aiAvatar : styles.userAvatar}`}>
              {msg.role === "ai" ? "Γ" : "👤"}
            </div>
            <div className={`${styles.chatBubble} ${msg.role === "user" ? styles.userBubble : styles.aiBubble}`}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className={styles.chatMsg}>
            <div className={`${styles.chatAvatar} ${styles.aiAvatar}`}>Γ</div>
            <div className={`${styles.chatBubble} ${styles.aiBubble}`}>
              <div className={styles.typingRow} style={{padding:0}}><span className={styles.dot}/><span className={styles.dot}/><span className={styles.dot}/></div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div className={styles.quickCmds}>
        {quickCmds.map(cmd => <button key={cmd} className={styles.quickCmd} onClick={() => send(cmd)}>{cmd}</button>)}
      </div>
      <div className={styles.chatInputRow}>
        <textarea className={styles.chatTextarea} rows={1} placeholder="Πληκτρολόγησε εντολή..."
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }} />
        <button className={styles.chatSend} onClick={() => send()} disabled={loading||!input.trim()}>➤</button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const tabs = [
  { id: "assistant", label: "Γραμματέας", icon: "🤖" },
  { id: "emails", label: "Emails", icon: "📧" },
  { id: "schedule", label: "Πρόγραμμα", icon: "📍" },
  { id: "docs", label: "Έγγραφα", icon: "📄" },
];

export default function SecretaryApp() {
  const [activeTab, setActiveTab] = useState("assistant");

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>Γ</div>
          <div>
            <div className={styles.brandTitle}>AI Γραμματέας</div>
            <div className={styles.brandSub}>Executive Assistant</div>
          </div>
        </div>
        <div className={styles.tabs}>
          {tabs.map(tab => (
            <button key={tab.id} className={`${styles.tab} ${activeTab===tab.id ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.body}>
        {activeTab === "assistant" && <AssistantTab />}
        {activeTab === "emails" && <EmailTab />}
        {activeTab === "schedule" && <ScheduleTab />}
        {activeTab === "docs" && <DocsTab />}
      </div>
    </div>
  );
}
