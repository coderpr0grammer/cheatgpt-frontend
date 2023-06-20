import { useState } from 'react'

import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <input type="text" placeholder="question" className='shadow'/>
          <button className='border shadow'>Ask</button>
       </div>
    </>
  )
}

export default App
