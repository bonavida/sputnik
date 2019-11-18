import React from 'react';
import logo from 'assets/img/logo.svg';

import './App.css';

const { remote } = window.electron || {};

const App = () => {
  const clickHandler = () => {
    remote && remote.dialog.showMessageBox({
      type: 'info',
      title: 'Electron dialog',
      message: 'This is an electron dialog'
    });
  }
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/containers/App/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <button onClick={clickHandler}>Click me</button>
      </header>
    </div>
  );
}

export default App;
