import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RfpList from './pages/RfpList';
import RfpCreate from './pages/RfpCreate';
import RfpDetail from './pages/RfpDetail';
import VendorList from './pages/VendorList';
import Comparison from './pages/Comparison';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="rfps" element={<RfpList />} />
        <Route path="rfps/create" element={<RfpCreate />} />
        <Route path="rfps/:id" element={<RfpDetail />} />
        <Route path="rfps/:id/compare" element={<Comparison />} />
        <Route path="vendors" element={<VendorList />} />
      </Route>
    </Routes>
  );
}

export default App;
