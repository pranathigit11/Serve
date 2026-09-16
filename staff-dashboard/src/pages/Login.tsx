import React from 'react';

const Login: React.FC = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Staff Login</h2>
        <form>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block' }}>Email</label>
            <input type="email" placeholder="Enter your email" />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block' }}>Password</label>
            <input type="password" placeholder="Enter your password" />
          </div>
          <button type="button">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
