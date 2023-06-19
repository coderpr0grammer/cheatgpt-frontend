import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <input type="text" placeholder="question" style={{border:'none'}}/>
      <button style={{background: 'transparent', borderRadius: 5, borderColor: 'rgba(0,0,0,0.2)'}}>Submit</button>
    </div>
  );
}

export default App;
