import { useState, useEffect } from 'react';
import { Settings, Power, UserX, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { Tooltip } from '../Tooltip';

export function AdminSettings() {
    const { getToken } = useAuth();
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = await getToken();
            const res = await fetch('/api/admin?resource=settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error(error);
            setMsg({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: string) => {
        setSaving(key);
        setMsg(null);
        try {
            const token = await getToken();
            const res = await fetch('/api/admin?resource=settings', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key, value })
            });

            if (!res.ok) throw new Error('Failed to update setting');

            setSettings(prev => ({ ...prev, [key]: value }));
            setMsg({ type: 'success', text: 'Setting updated successfully' });
        } catch (error) {
            console.error(error);
            setMsg({ type: 'error', text: 'Failed to save setting' });
        } finally {
            setSaving(null);
        }
    };

    const Toggle = ({
        label,
        description,
        settingKey,
        icon: Icon,
        tooltip
    }: {
        label: string,
        description: string,
        settingKey: string,
        icon: any,
        tooltip?: string
    }) => {
        const isEnabled = settings[settingKey] === 'true';

        return (
            <div className="flex items-start justify-between p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                    <div className={`p-3 rounded-lg ${isEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-lg font-medium text-gray-900">{label}</h3>
                            {tooltip && (
                                <Tooltip content={tooltip} position="bottom">
                                    <span className="text-[10px] text-gray-400 border border-gray-300 px-1.5 py-0.5 rounded-full font-bold cursor-help bg-gray-50 hover:bg-gray-100 hover:text-gray-600 transition-colors">?</span>
                                </Tooltip>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{description}</p>
                    </div>
                </div>
                <button
                    onClick={() => updateSetting(settingKey, isEnabled ? 'false' : 'true')}
                    disabled={saving === settingKey}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="w-8 h-8" />
                    System Settings
                </h1>
                <p className="text-gray-500 mt-2">Manage global application configurations and emergency switches.</p>
            </div>

            {msg && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {msg.text}
                </div>
            )}

            <div className="grid gap-6">
                <Toggle
                    label="Maintenance Mode"
                    description="Enable to prevent non-admin users from accessing the application. Useful during upgrades."
                    settingKey="maintenance_mode"
                    icon={Power}
                    tooltip="Block all non-admin users from accessing the app. Useful during system upgrades and database migrations."
                />

                <Toggle
                    label="Disable Registrations"
                    description="Prevent new users from signing up. Existing users can still log in."
                    settingKey="disable_registrations"
                    icon={UserX}
                    tooltip="Stop new users from signing up. Existing administrators can log in normally."
                />
            </div>

            <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <h4 className="flex items-center gap-2 font-medium text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    Note
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                    Changes to these settings take effect immediately for all users. Please use cautiously.
                </p>
            </div>
        </div>
    );
}
