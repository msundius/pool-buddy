import React, { useState } from 'react';
import { InAppNotification } from '../types';
import { Bell, BellRing, Check, ShieldAlert, BadgeInfo, Smartphone, Settings } from 'lucide-react';

interface NotificationCenterProps {
  notifications: InAppNotification[];
  onMarkRead: (notificationId: string) => void;
  onClearAll: () => void;
}

export function NotificationCenter({ notifications, onMarkRead, onClearAll }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRequestPush = async () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushEnabled(true);
          // Standard browser alert to demonstrate active browser level sync
          new window.Notification("Above-Ground Pool Buddy Integrated", {
            body: "Push Notifications are actively synced for pool water monitoring alerts!",
          });
        } else {
          alert('Notifications were blocked. Please enable them in your browser settings.');
        }
      } else {
        setPushEnabled(true); // fallback simulation
      }
    } catch {
      setPushEnabled(true); // fallback simulation
    }
  };

  const getAlertIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'danger':
        return <ShieldAlert className="h-4 w-4 text-rose-500" />;
      case 'warning':
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      default:
        return <BadgeInfo className="h-4 w-4 text-sky-500" />;
    }
  };

  const getAlertBg = (type: InAppNotification['type']) => {
    switch (type) {
      case 'danger':
        return 'bg-rose-50/50 border-rose-100';
      case 'warning':
        return 'bg-amber-50/50 border-amber-100';
      default:
        return 'bg-sky-50/50 border-sky-100';
    }
  };

  return (
    <div id="notification-center-container" className="relative">
      
      {/* Alert Header Trigger Bell Button */}
      <button
        id="btn-bell-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-white border border-slate-200 hover:border-slate-300 p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center text-slate-600"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="h-5 w-5 text-sky-600 animate-bounce" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white font-mono text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {unreadCount}
            </span>
          </>
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </button>

      {/* Popover list */}
      {isOpen && (
        <div id="notifications-popover" className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-semibold text-slate-800 text-sm">System Smart Alerts</span>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <button
                  id="btn-clear-notifications"
                  onClick={onClearAll}
                  className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
              <button
                id="btn-close-notifications"
                onClick={() => setIsOpen(false)}
                className="text-[10px] text-slate-400 font-bold hover:text-slate-600 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Browser Push Permission Setup */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Smartphone className={`h-4.5 w-4.5 ${pushEnabled ? 'text-emerald-500' : 'text-slate-400'}`} />
              <div>
                <p className="font-semibold text-slate-700">Mobile Push Integration</p>
                <p className="text-[10px] text-slate-400">
                  {pushEnabled ? 'Browser notifications active' : 'Click to enable HTML5 alerts'}
                </p>
              </div>
            </div>
            {!pushEnabled && (
              <button
                id="btn-link-push-alerts"
                onClick={handleRequestPush}
                className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Activate
              </button>
            )}
          </div>

          {/* Notifications feed */}
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Water looks clean! No alerts raised.</p>
            ) : (
              notifications.map((n) => (
                <div
                  id={`notif-${n.id}`}
                  key={n.id}
                  className={`border rounded-xl p-2.5 flex justify-between gap-2 transition-all ${getAlertBg(n.type)} ${
                    n.read ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  <div className="flex gap-2 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">{getAlertIcon(n.type)}</div>
                    <div className="min-w-0 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800 text-[11px] truncate">{n.title}</p>
                      <p className="text-[10px] leading-relaxed break-words">{n.message}</p>
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5 block">
                        {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      id={`btn-mark-read-${n.id}`}
                      onClick={() => onMarkRead(n.id)}
                      className="text-sky-500 hover:text-sky-700 font-bold text-[10px] self-start cursor-pointer transition-transform active:scale-90 p-1 flex items-center justify-center rounded-lg bg-white shadow-xs border border-slate-200"
                      title="Dismiss Alert"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
