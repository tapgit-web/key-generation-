import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Database, 
  PlusCircle, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Activity, 
  ShieldCheck,
  ShieldAlert,
  Search,
  Pencil
} from 'lucide-react';
import './App.css';

function App() {
  // Backend & Connection State (Locked statically for security)
  const [backendUrl, setBackendUrl] = useState(
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : 'https://tap-server-v2.onrender.com'
  );
  const [isOnline, setIsOnline] = useState(false);
  
  // Admin Access State
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [showAdminToken, setShowAdminToken] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(!!localStorage.getItem('adminToken'));
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminStats, setAdminStats] = useState({ total: 0, available: 0, activated: 0, expired: 0 });
  const [licensesList, setLicensesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New license input states
  const [newLicenseType, setNewLicenseType] = useState('Lifetime');
  const [newBrandName, setNewBrandName] = useState('TAP Sentinel');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  
  const [isAddingLicense, setIsAddingLicense] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [adminError, setAdminError] = useState('');

  // Code Copy feedback helper
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Edit license modal states
  const [editingLicense, setEditingLicense] = useState(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editLicenseType, setEditLicenseType] = useState('Lifetime');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Health check to auto-verify backend connection
  const checkHealth = async (urlToCheck = backendUrl) => {
    try {
      const response = await fetch(`${urlToCheck}/health`);
      if (response.ok) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch (err) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Auto refresh health check every 15s
    const timer = setInterval(() => checkHealth(), 15000);
    return () => clearInterval(timer);
  }, [backendUrl]);

  // Fetch admin dashboard info if token authenticated
  const fetchAdminData = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch(`${backendUrl}/admin/licenses`, {
        headers: {
          'x-admin-token': adminToken
        }
      });
      if (res.status === 200) {
        const data = await res.json();
        setAdminStats({
          total: data.total,
          available: data.available,
          activated: data.activated,
          expired: data.expired
        });
        setLicensesList(data.data || []);
        setIsAdminAuthenticated(true);
        setAdminError('');
      } else {
        setIsAdminAuthenticated(false);
        setAdminToken('');
        localStorage.removeItem('adminToken');
        setAdminError('Session expired or unauthorized token.');
      }
    } catch (err) {
      setIsAdminAuthenticated(false);
      setAdminError('Could not communicate with the backend.');
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setAdminError('Username and password are required.');
      return;
    }
    
    try {
      const res = await fetch(`${backendUrl}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword.trim()
        })
      });
      
      const data = await res.json();
      if (res.status === 200 && data.success) {
        setAdminToken(data.token);
        localStorage.setItem('adminToken', data.token);
        setIsAdminAuthenticated(true);
        setAdminError('');
        
        // Fetch data immediately with the new token
        try {
          const statsRes = await fetch(`${backendUrl}/admin/licenses`, {
            headers: {
              'x-admin-token': data.token
            }
          });
          if (statsRes.status === 200) {
            const statsData = await statsRes.json();
            setAdminStats({
              total: statsData.total,
              available: statsData.available,
              activated: statsData.activated,
              expired: statsData.expired
            });
            setLicensesList(statsData.data || []);
          }
        } catch (fetchErr) {
          console.error('Failed to fetch registry data after login.', fetchErr);
        }
      } else {
        setAdminError(data.msg || 'Invalid username or password.');
      }
    } catch (err) {
      setAdminError('Could not communicate with the authorization server.');
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchAdminData();
    }
  }, [isAdminAuthenticated]);

  // Create/Add a new license key (Admin portal)
  const handleAddLicense = async (e) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;

    if (newLicenseType === 'Expiry' && !newExpiryDate) {
      alert('Expiry Date is required for Expiry-type licenses.');
      return;
    }

    setIsAddingLicense(true);
    try {
      const res = await fetch(`${backendUrl}/admin/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          key: newKeyInput.trim().toUpperCase(),
          licenseType: newLicenseType,
          brandName: newBrandName,
          expiryDate: newLicenseType === 'Lifetime' ? null : newExpiryDate
        })
      });

      const data = await res.json();
      if (data.success) {
        setNewKeyInput('');
        setNewLicenseType('Lifetime');
        setNewBrandName('TAP Sentinel');
        setNewExpiryDate('');
        fetchAdminData();
      } else {
        alert(`Failed to create license: ${data.msg}`);
      }
    } catch (err) {
      alert('Server error occurred during key registration.');
    } finally {
      setIsAddingLicense(false);
    }
  };

  const formatLocalDate = (dateString) => {
    if (!dateString) return '--';
    const datePart = dateString.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
    return new Date(dateString).toLocaleDateString();
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getLicenseStatus = (lic) => {
    if (lic.licenseType === 'Expiry' && lic.expiryDate && new Date(lic.expiryDate) < new Date()) {
      return 'expired';
    }
    return lic.status || 'new';
  };

  const filteredLicenses = licensesList.filter(l => {
    const status = getLicenseStatus(l);
    if (activeFilter !== 'all' && status !== activeFilter) {
      return false;
    }
    return (
      l.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.hwid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.brandName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingLicense) return;

    if (editLicenseType === 'Expiry' && !editExpiryDate) {
      alert('Expiry Date is required for Expiry-type licenses.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`${backendUrl}/admin/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          key: editingLicense.key,
          licenseType: editLicenseType,
          brandName: editBrandName,
          expiryDate: editLicenseType === 'Lifetime' ? null : editExpiryDate
        })
      });

      const data = await res.json();
      if (data.success) {
        setEditingLicense(null);
        fetchAdminData();
      } else {
        alert(`Failed to update license: ${data.msg}`);
      }
    } catch (err) {
      alert('Server error occurred during license update.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Generate dynamic random secure key to speed up testing
  const generateRandomTestKey = () => {
    const segments = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    return segments.join('-');
  };

  return (
    <div className="app-container">
      {/* Top Banner Navigation */}
      <header className="app-header glass-panel">
        <div className="brand-section">
          <div className="brand-logo-glow animate-float">
            <KeyRound size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 className="brand-name">TAP Sentinel</h1>
              <span 
                className={`status-indicator ${isOnline ? 'online' : 'offline'}`}
                style={{ width: '8px', height: '8px', display: 'inline-block' }}
                title={isOnline ? "Server Online" : "Server Offline"}
              ></span>
            </div>
            <div className="brand-tagline">Secure Node Activation Gate</div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        {!isAdminAuthenticated ? (
          /* Login Form */
          <div className="glass-panel" style={{ maxWidth: '480px', margin: '2rem auto', textAlign: 'center' }}>
            <h2 className="section-title" style={{ justifyContent: 'center' }}>
              <Lock size={20} />
              Console Authorization Wall
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Access to registry databases requires authorized administrative credentials.
            </p>

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Administrator ID</label>
                <div className="input-container">
                  <Unlock className="input-icon" size={18} />
                  <input 
                    type="text"
                    className="styled-input"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Admin ID"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Password</label>
                <div className="input-container">
                  <Lock className="input-icon" size={18} />
                  <input 
                    type={showAdminToken ? 'text' : 'password'}
                    className="styled-input"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Password"
                    required
                  />
                  <button 
                    type="button" 
                    className="input-btn-inline"
                    onClick={() => setShowAdminToken(!showAdminToken)}
                  >
                    {showAdminToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {adminError && (
                <p style={{ color: 'var(--rose)', fontSize: '0.8rem', textAlign: 'left' }}>
                  ⚠️ {adminError}
                </p>
              )}

              <button type="submit" className="btn-primary" disabled={!isOnline}>
                <Unlock size={18} />
                Verify and Open Gate
              </button>
            </form>
          </div>
        ) : (
          /* Secure Console Dashboard */
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="section-title" style={{ border: 'none', padding: '0', marginBottom: '0.25rem' }}>
                  <Database size={20} />
                  License Registry Console
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Manage hardware tokens, revoke active links, or register fresh cryptographic keys.
                </p>
              </div>

              <button 
                className="btn-secondary" 
                onClick={() => {
                  setIsAdminAuthenticated(false);
                  setAdminToken('');
                  localStorage.removeItem('adminToken');
                  setAdminUsername('');
                  setAdminPassword('');
                }}
              >
                <Lock size={14} />
                Lock Console
              </button>
            </div>

            {/* Stat Cards */}
            {/* Stat Cards */}
            <div className="stats-container" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div 
                className="stat-card" 
                style={{ 
                  cursor: 'pointer', 
                  border: activeFilter === 'all' ? '1px solid var(--primary-light)' : '1px solid var(--border-color)',
                  boxShadow: activeFilter === 'all' ? '0 0 12px var(--primary-glow)' : 'none',
                  transform: activeFilter === 'all' ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setActiveFilter('all')}
              >
                <div className="stat-icon-wrapper purple">
                  <KeyRound size={20} />
                </div>
                <div className="stat-details">
                  <span className="stat-value">{adminStats.total}</span>
                  <span className="stat-label">Total Keys</span>
                </div>
              </div>
              
              <div 
                className="stat-card" 
                style={{ 
                  cursor: 'pointer', 
                  border: activeFilter === 'active' ? '1px solid var(--emerald)' : '1px solid var(--border-color)',
                  boxShadow: activeFilter === 'active' ? '0 0 12px var(--emerald-glow)' : 'none',
                  transform: activeFilter === 'active' ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setActiveFilter('active')}
              >
                <div className="stat-icon-wrapper green">
                  <ShieldCheck size={20} />
                </div>
                <div className="stat-details">
                  <span className="stat-value">{adminStats.activated}</span>
                  <span className="stat-label">Activated</span>
                </div>
              </div>

              <div 
                className="stat-card" 
                style={{ 
                  cursor: 'pointer', 
                  border: activeFilter === 'new' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  boxShadow: activeFilter === 'new' ? '0 0 12px var(--accent-cyan-glow)' : 'none',
                  transform: activeFilter === 'new' ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setActiveFilter('new')}
              >
                <div className="stat-icon-wrapper cyan">
                  <Activity size={20} />
                </div>
                <div className="stat-details">
                  <span className="stat-value">{adminStats.available}</span>
                  <span className="stat-label">Available</span>
                </div>
              </div>

              <div 
                className="stat-card" 
                style={{ 
                  cursor: 'pointer', 
                  border: activeFilter === 'expired' ? '1px solid var(--rose)' : '1px solid var(--border-color)',
                  boxShadow: activeFilter === 'expired' ? '0 0 12px var(--rose-glow)' : 'none',
                  transform: activeFilter === 'expired' ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setActiveFilter('expired')}
              >
                <div className="stat-icon-wrapper rose">
                  <ShieldAlert size={20} />
                </div>
                <div className="stat-details">
                  <span className="stat-value">{adminStats.expired}</span>
                  <span className="stat-label">Expired</span>
                </div>
              </div>
            </div>

            {/* Add License Form */}
            <form onSubmit={handleAddLicense} style={{ 
              background: 'rgba(255,255,255,0.02)',
              padding: '1.25rem',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <h4 style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>Register New Secure Key</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                  <label className="form-label">License Key</label>
                  <div className="input-container">
                    <KeyRound className="input-icon" size={18} />
                    <input 
                      type="text" 
                      className="styled-input mono"
                      placeholder="TAP-XXXX-XXXX-XXXX"
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      required
                      style={{ paddingRight: '6rem' }}
                    />
                    <button 
                      type="button" 
                      className="input-btn-inline"
                      onClick={() => setNewKeyInput(generateRandomTestKey())}
                      style={{ right: '0.75rem', fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                  <label className="form-label">Brand Name</label>
                  <div className="input-container">
                    <input 
                      type="text" 
                      className="styled-input"
                      style={{ paddingLeft: '1rem' }}
                      placeholder="e.g. Automation People"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                  <label className="form-label">Licence Type</label>
                  <div className="input-container">
                    <select 
                      className="styled-input"
                      style={{ paddingLeft: '1rem', background: 'var(--bg-tertiary)', color: 'white' }}
                      value={newLicenseType}
                      onChange={(e) => {
                        setNewLicenseType(e.target.value);
                        if (e.target.value === 'Lifetime') {
                          setNewExpiryDate('');
                        }
                      }}
                    >
                      <option value="Lifetime">Lifetime</option>
                      <option value="Expiry">Expiry</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0, textAlign: 'left', opacity: newLicenseType === 'Lifetime' ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
                  <label className="form-label">Expiry Date {newLicenseType === 'Lifetime' ? '(Not Applicable)' : '(Required)'}</label>
                  <div className="input-container">
                    <input 
                      type="date" 
                      className="styled-input"
                      style={{ paddingLeft: '1rem', colorScheme: 'dark' }}
                      value={newExpiryDate}
                      onChange={(e) => setNewExpiryDate(e.target.value)}
                      disabled={newLicenseType === 'Lifetime'}
                      required={newLicenseType === 'Expiry'}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }} disabled={isAddingLicense}>
                <PlusCircle size={16} />
                Register Secure License Key
              </button>
            </form>

            {/* Table Registry Search */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>Active Keys Database</h4>
                <div className="input-container" style={{ width: '220px' }}>
                  <Search className="input-icon" size={14} style={{ left: '0.75rem' }} />
                  <input 
                    type="text"
                    className="styled-input"
                    style={{ padding: '0.4rem 0.8rem 0.4rem 2rem', fontSize: '0.8rem', borderRadius: '8px' }}
                    placeholder="Filter registry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>License Key</th>
                      <th>Brand Name</th>
                      <th>Licence Type</th>
                      <th>Status</th>
                      <th>HWID Binding</th>
                      <th>Expiry Date</th>
                      <th>Activated At</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLicenses.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No license records match your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredLicenses.map((lic, idx) => (
                        <tr key={lic.key}>
                          <td className="mono-cell" style={{ color: 'white' }}>{lic.key}</td>
                          <td>{lic.brandName || '--'}</td>
                          <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            {lic.licenseType || 'Lifetime'}
                          </td>
                          <td>
                            <span className={`status-badge ${getLicenseStatus(lic)}`}>
                              {getLicenseStatus(lic)}
                            </span>
                          </td>
                          <td className="mono-cell">{lic.hwid === 'null' ? '--' : lic.hwid}</td>
                          <td>
                            {lic.licenseType === 'Lifetime' ? 'Lifetime' : formatLocalDate(lic.expiryDate)}
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {lic.activatedAt ? new Date(lic.activatedAt).toLocaleString() : '--'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="input-btn-inline" 
                              style={{ position: 'static', marginRight: '0.5rem' }}
                              onClick={() => copyToClipboard(lic.key, idx)}
                              title="Copy License Key"
                            >
                              {copiedIndex === idx ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
                            </button>
                            <button 
                              className="input-btn-inline" 
                              style={{ position: 'static', marginRight: '0.5rem' }}
                              onClick={() => {
                                setEditingLicense(lic);
                                setEditBrandName(lic.brandName || '');
                                setEditLicenseType(lic.licenseType || 'Lifetime');
                                setEditExpiryDate(lic.expiryDate ? lic.expiryDate.split('T')[0] : '');
                              }}
                              title="Edit License"
                            >
                              <Pencil size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {editingLicense && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 11, 18, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div className="glass-panel" style={{
              width: '100%',
              maxWidth: '480px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="section-title" style={{ border: 'none', margin: 0, padding: 0 }}>
                  <Database size={20} />
                  Edit License Data
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {editingLicense.key}
                </span>
              </div>

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Brand Name</label>
                  <input 
                    type="text" 
                    className="styled-input"
                    style={{ paddingLeft: '1rem' }}
                    value={editBrandName}
                    onChange={(e) => setEditBrandName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Licence Type</label>
                  <select 
                    className="styled-input"
                    style={{ paddingLeft: '1rem', background: 'var(--bg-tertiary)', color: 'white' }}
                    value={editLicenseType}
                    onChange={(e) => {
                      setEditLicenseType(e.target.value);
                      if (e.target.value === 'Lifetime') {
                        setEditExpiryDate('');
                      }
                    }}
                  >
                    <option value="Lifetime">Lifetime</option>
                    <option value="Expiry">Expiry</option>
                  </select>
                </div>

                <div className="form-group" style={{ 
                  margin: 0, 
                  opacity: editLicenseType === 'Lifetime' ? 0.5 : 1, 
                  transition: 'opacity 0.2s ease' 
                }}>
                  <label className="form-label">Expiry Date {editLicenseType === 'Lifetime' ? '(Not Applicable)' : '(Required)'}</label>
                  <input 
                    type="date" 
                    className="styled-input"
                    style={{ paddingLeft: '1rem', colorScheme: 'dark' }}
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    disabled={editLicenseType === 'Lifetime'}
                    required={editLicenseType === 'Expiry'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '0.75rem' }} 
                    onClick={() => setEditingLicense(null)}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '0.75rem' }}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
