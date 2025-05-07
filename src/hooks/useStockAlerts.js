import { useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchStockAlerts } from '../api/stockAlerts';

export default function useStockAlerts() {
  const { userToken, user } = useContext(AuthContext);

  useEffect(() => {
    if (!userToken || !user) return;
    if (!['admin','dev','warehouse-admin'].includes(user.role)) return;

    const checkAlerts = async () => {
      try {
        const alerts = await fetchStockAlerts(userToken);
        if (alerts.length > 0) {
          Alert.alert('Stock Alerts', alerts.join('\n'));
        }
      } catch (err) {
        console.error('Error fetching stock alerts:', err);
      }
    };

    // Initial check
    checkAlerts();
    // Poll every 5 minutes
    const interval = setInterval(checkAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userToken, user]);
} 