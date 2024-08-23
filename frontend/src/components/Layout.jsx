import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div>
      {/* <Navbar /> */}
      <div className="columns is-gapless" style={{ marginTop: '20px', marginLeft: '20px', marginRight: '20px' }}>
        {/* Sidebar */}
        <div className="column is-2">
          <Sidebar />
        </div>
        {/* Conteúdo Principal */}
        <div className="column is-9" style={{ marginTop: '20px', marginLeft: '20px', marginRight: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;

