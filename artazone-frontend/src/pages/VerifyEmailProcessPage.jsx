import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VerifyEmailProcessPage = () => {
  const { id, hash } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); 
  const [message, setMessage] = useState('Sedang memverifikasi email Anda...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const expires = searchParams.get('expires');
        const signature = searchParams.get('signature');
        
        // Pastikan VITE_API_URL sudah diset di file .env frontend kamu
        const apiUrl = import.meta.env.VITE_API_URL || 'https://artazone-api.onrender.com/api';
        
        await axios.get(`${apiUrl}/email/verify/${id}/${hash}?expires=${expires}&signature=${signature}`, {
          headers: {
            'Accept': 'application/json'
          }
        });

        setStatus('success');
        setMessage('Email Anda berhasil diverifikasi! Mengalihkan ke dashboard...');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);

      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.');
      }
    };

    if (id && hash) {
      verifyEmail();
    }
  }, [id, hash, searchParams, navigate]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">{message}</h2>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Berhasil!</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Gagal</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button 
              onClick={() => navigate('/auth')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Kembali ke Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailProcessPage;