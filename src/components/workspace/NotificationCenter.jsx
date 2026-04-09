/**
 * NotificationCenter — Real-time toast notifications
 * Triggers: high-severity anomalies, report generation, Slack webhook status
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, Info, X, Bell, Send,
  Zap, FileText, AlertCircle
} from 'lucide-react';

const NOTIFICATION_TYPES = {
  anomaly_high: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/25',
    title: 'High-Severity Anomaly Detected',
  },
  report_generated: {
    icon: FileText,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/25',
    title: 'Report Generated',
  },
  slack_sent: {
    icon: Send,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/25',
    title: 'Sent to Slack',
  },
  slack_error: {
    icon: AlertCircle,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/25',
    title: 'Slack Webhook Failed',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/25',
    title: 'Success',
  },
  info: {
    icon: Info,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/25',
    title: 'Notification',
  },
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, message, duration = 4000) => {
    const id = `notif-${Date.now()}`;
    const notification = { id, type, message };
    setNotifications(n => [...n, notification]);
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(n => n.filter(notif => notif.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(n => n.filter(notif => notif.id !== id));
  }, []);

  // Expose methods globally (for use anywhere in the app)
  globalThis.notificationCenter = { addNotification, removeNotification };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm">
      <AnimatePresence mode="popLayout">
        {notifications.map(notif => {
          const meta = NOTIFICATION_TYPES[notif.type] || NOTIFICATION_TYPES.info;
          const Icon = meta.icon;
          return (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, y: 16, x: 384 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, x: 384 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className={`flex items-start gap-3 p-4 rounded-xl border pointer-events-auto ${meta.bg} ${meta.border} shadow-2xl`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${meta.color}`} />
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${meta.color}`}>{meta.title}</div>
                {notif.message && <div className="text-xs text-white/65 mt-0.5 leading-relaxed">{notif.message}</div>}
              </div>
              <button
                onClick={() => removeNotification(notif.id)}
                className="text-white/30 hover:text-white/70 flex-shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}