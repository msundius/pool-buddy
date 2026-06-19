import React, { useState } from 'react';
import { AlexaConnection, PumpStatus, ChlorinatorStatus, HeaterStatus, ThermometerStatus } from '../types';
import { ShieldCheck, Wifi, RefreshCw, Key, ShieldAlert, Cpu, CheckSquare, Sliders, Play, Code, Database, Globe } from 'lucide-react';

interface AlexaConnectionManagerProps {
  connection: AlexaConnection;
  pump: PumpStatus;
  chlorinator: ChlorinatorStatus;
  heater: HeaterStatus;
  thermometer: ThermometerStatus;
  onUpdateConnection: (updates: Partial<AlexaConnection>) => void;
  onAlexaWebhookTrigger: (command: string) => void;
}

export function AlexaConnectionManager({
  connection,
  pump,
  chlorinator,
  heater,
  thermometer,
  onUpdateConnection,
  onAlexaWebhookTrigger,
}: AlexaConnectionManagerProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverySuccess, setDiscoverySuccess] = useState<string | null>(null);
  const [showDeveloperInspector, setShowDeveloperInspector] = useState(false);
  const [testCmdPrompt, setTestCmdPrompt] = useState('Alexa, turn on the pool heater');
  const [customRegion, setCustomRegion] = useState(connection.serverRegion);

  // Rotate account linking OTP
  const handleRotateAuthCode = () => {
    const segment1 = Math.floor(100 + Math.random() * 900);
    const segment2 = Math.floor(100 + Math.random() * 900);
    onUpdateConnection({ authCode: `${segment1}-${segment2}` });
  };

  // Perform virtual Alexa Smart Home Device Discovery
  const handleDiscoverDevices = () => {
    setIsDiscovering(true);
    setDiscoverySuccess('Querying AWS Lambda registry...');
    setTimeout(() => {
      setIsDiscovering(false);
      setDiscoverySuccess('Discovered 4 IoT smart endpoints successfully.');
      onUpdateConnection({ smartHomeLinkedAt: new Date().toISOString() });
      setTimeout(() => setDiscoverySuccess(null), 4000);
    }, 1800);
  };

  // Trigger simulated HTTP webhook from Alexa
  const [lastWebhookResponse, setLastWebhookResponse] = useState<any | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  const handleSendMockWebhook = async () => {
    if (!testCmdPrompt.trim()) return;
    setWebhookLoading(true);
    
    try {
      // Simulate OAuth verification and payload construction
      const mockPayload = {
        directive: {
          header: {
            namespace: "Alexa.PowerController",
            name: "TurnOn",
            payloadVersion: "3",
            messageId: Math.random().toString(36).substring(7),
            correlationToken: "AQT-1029-POOL-TOKEN"
          },
          endpoint: {
            scope: {
              type: "BearerToken",
              token: "Atza|IQEBLjAsAhQy..."
            },
            endpointId: "pool_switch_01"
          },
          payload: {}
        }
      };

      setLastWebhookResponse({
        status: 'Triggering Webhook...',
        timestamp: new Date().toISOString(),
        requestHeaders: {
          'Host': 'pool-buddy-lambda.amazonaws.com',
          'Authorization': `Bearer AWS-SIG-V4-EXPIRED-${Math.floor(Date.now()/1000)}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AlexaSmartHomeSkill-Gateway/2.0'
        },
        payloadSent: mockPayload
      });

      // Execute trigger
      onAlexaWebhookTrigger(testCmdPrompt);
      
      setTimeout(() => {
        setLastWebhookResponse((prev: any) => ({
          ...prev,
          status: 'SUCCESS 200 OK',
          latency: '244ms',
          responsePayload: {
            event: {
              header: {
                namespace: "Alexa",
                name: "Response",
                messageId: Math.random().toString(36).substring(7),
                payloadVersion: "3"
              },
              endpoint: {
                endpointId: "pool_switch_01"
              },
              payload: {}
            },
            context: {
              properties: [
                {
                  namespace: "Alexa.PowerController",
                  name: "powerState",
                  value: "ON",
                  timeOfSample: new Date().toISOString(),
                  uncertaintyInMilliseconds: 50
                }
              ]
            }
          }
        }));
        setWebhookLoading(false);
      }, 800);

    } catch (e: any) {
      setLastWebhookResponse({
        status: '401 UNAUTHORIZED',
        error: e.message
      });
      setWebhookLoading(false);
    }
  };

  return (
    <div id="alexa-connection-manager-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl text-white bg-gradient-to-br ${
              connection.isLinked && connection.allowExternalCommands 
                ? 'from-sky-450 to-sky-600 bg-sky-500' 
                : 'from-slate-400 to-slate-500'
            }`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Alexa Skill Link Manager</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Account Linking, Gateway & Security Console</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {connection.isLinked ? (
              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
                Linked Active
              </span>
            ) : (
              <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase">
                Not Linked
              </span>
            )}
          </div>
        </div>

        {/* Integration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Main Account Connection State */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Account Linking State</span>
              <button
                id="btn-link-unlink-alexa"
                onClick={() => onUpdateConnection({ isLinked: !connection.isLinked })}
                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all active:scale-95 border cursor-pointer ${
                  connection.isLinked 
                    ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/50' 
                    : 'bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100'
                }`}
              >
                {connection.isLinked ? 'Disconnect User' : 'Connect User'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {connection.isLinked 
                ? 'Your Amazon Customer Profile is authenticated via secure OAuth token exchange.' 
                : 'Account link is inactive. Alexa commands will refuse execution until connected.'
              }
            </p>
          </div>

          {/* External Command Lock Switch */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                Mute Voice Commands
              </span>
              <button
                id="btn-toggle-external-cmds"
                onClick={() => onUpdateConnection({ allowExternalCommands: !connection.allowExternalCommands })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  connection.allowExternalCommands ? 'bg-sky-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    connection.allowExternalCommands ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {connection.allowExternalCommands 
                ? 'External requests originating from Alexa smart speakers are authorized.' 
                : 'Secure voice-lock is active. Cloud commands will fail to update hardware status.'
              }
            </p>
          </div>
        </div>

        {/* Pairing Tokens & Servers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Pair Code Box */}
          <div className="border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 bg-white">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OAuth Secure OTP Code</span>
              <div className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono text-base font-extrabold text-slate-800 tracking-tight">{connection.authCode}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Valid for next 10 minutes</p>
            </div>
            <button
              id="btn-rotate-link-code"
              onClick={handleRotateAuthCode}
              title="Generate new pairing authorization code"
              className="bg-slate-50 border border-slate-200 hover:bg-slate-100 p-2 rounded-xl cursor-pointer text-slate-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Region Switcher */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-1.5 bg-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amazon Lambda Endpoint Region</span>
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-slate-400" />
              <select
                id="select-alexa-region"
                value={customRegion}
                onChange={(e) => {
                  setCustomRegion(e.target.value);
                  onUpdateConnection({ serverRegion: e.target.value });
                }}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 bg-white font-medium focus:outline-none"
              >
                <option value="us-east-1">North America (us-east-1)</option>
                <option value="eu-west-1">Europe/UK (eu-west-1)</option>
                <option value="us-west-2">US West (us-west-2)</option>
                <option value="ap-northeast-1">Far East (ap-northeast-1)</option>
              </select>
            </div>
            <p className="text-[9px] text-slate-400">AWS Signature v4 payload authorization</p>
          </div>
        </div>

        {/* Alexa Smart Home Device Discovery Status */}
        <div className="border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Alexa Smart-Home Device Sync Status</h4>
              <p className="text-[10px] text-slate-400 font-medium">Last full smart home scan: <b>{connection.smartHomeLinkedAt ? new Date(connection.smartHomeLinkedAt).toLocaleString() : 'Never'}</b></p>
            </div>
            <button
              id="btn-trigger-alexa-discovery"
              onClick={handleDiscoverDevices}
              disabled={isDiscovering || !connection.isLinked}
              className="text-[10px] font-bold bg-sky-500 text-white hover:bg-sky-600 disabled:bg-slate-350 disabled:opacity-50 transition-colors py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`h-3 w-3 ${isDiscovering ? 'animate-spin' : ''}`} />
              {isDiscovering ? 'Syncing Schema...' : 'Device Discovery'}
            </button>
          </div>

          {discoverySuccess && (
            <p className="text-[11px] font-semibold text-emerald-600 mb-2 py-0.5 bg-emerald-50 rounded-lg text-center border border-emerald-100">
              {discoverySuccess}
            </p>
          )}

          {/* List of endpoints reported to Alexa */}
          <div className="space-y-1.5 text-xs">
            {/* Device 1: Pump */}
            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 leading-relaxed">
              <span className="text-slate-500">Device Endpoint 1: <b>Smart Pool Pump</b></span>
              <span className={`text-[10px] font-semibold ${pump.isCurrentlyOn ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-50'} border px-1.5 rounded-md`}>
                {pump.isCurrentlyOn ? 'On' : 'Off'}
              </span>
            </div>
            {/* Device 2: Chlorinator */}
            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 leading-relaxed">
              <span className="text-slate-500">Device Endpoint 2: <b>Salt Chlorinator</b></span>
              <span className={`text-[10px] font-semibold ${chlorinator.isCurrentlyOn ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-50'} border px-1.5 rounded-md`}>
                {chlorinator.isCurrentlyOn ? 'On' : 'Off'} ({chlorinator.outputPercentage}%)
              </span>
            </div>
            {/* Device 3: Heater */}
            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 leading-relaxed">
              <span className="text-slate-500">Device Endpoint 3: <b>Pool Heater</b></span>
              <span className={`text-[10px] font-semibold ${heater.isCurrentlyOn ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-50'} border px-1.5 rounded-md`}>
                {heater.isCurrentlyOn ? 'On' : 'Off'} ({heater.targetTemperature}°F, {heater.mode.toUpperCase()})
              </span>
            </div>
            {/* Device 4: Buoy Thermometer */}
            <div className="flex items-center justify-between py-1 leading-relaxed">
              <span className="text-slate-500">Device Endpoint 4: <b>Floating Thermometer</b></span>
              <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 border px-1.5 rounded-md">
                Water: {thermometer.currentWaterTemp}°F
              </span>
            </div>
          </div>
        </div>

        {/* Developer Webhook Request/Response Logs inspector */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
          <button
            id="btn-toggle-developer-inspector"
            type="button"
            onClick={() => setShowDeveloperInspector(!showDeveloperInspector)}
            className="w-full bg-slate-100 hover:bg-slate-150 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors border-none"
          >
            <span className="flex items-center gap-1.5">
              <Code className="h-4 w-4 text-slate-500" />
              AWS Cloud Webhook Inspector / Trigger Sandbox
            </span>
            <span className="text-[10px] font-semibold text-sky-600 uppercase">
              {showDeveloperInspector ? 'Hide' : 'Show JSON Inspector'}
            </span>
          </button>

          {showDeveloperInspector && (
            <div className="p-4 bg-slate-900 text-slate-200 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 block uppercase">Test Skill Voice Directives Simulation</label>
                <div className="flex gap-2">
                  <input
                    id="input-inspector-voice-trigger"
                    type="text"
                    value={testCmdPrompt}
                    onChange={(e) => setTestCmdPrompt(e.target.value)}
                    placeholder="e.g. Alexa, set heater to 88 degrees"
                    className="flex-1 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none"
                  />
                  <button
                    id="btn-launch-mock-webhook"
                    onClick={handleSendMockWebhook}
                    disabled={webhookLoading || !connection.isLinked || !connection.allowExternalCommands}
                    className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer border-none"
                  >
                    <Play className="h-3 w-3" />
                    Web Trigger
                  </button>
                </div>
                {(!connection.isLinked || !connection.allowExternalCommands) && (
                  <p className="text-[10px] text-rose-400 font-medium flex items-center gap-1 mt-1">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Cannot trigger: Make sure Account Linking is enabled and external commands are not muted!
                  </p>
                )}
              </div>

              {lastWebhookResponse && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-slate-400 flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      Mock HTTP Post Transaction Log
                    </span>
                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                      lastWebhookResponse.status.includes('200') 
                        ? 'bg-emerald-950 text-emerald-400' 
                        : 'bg-rose-950 text-rose-450'
                    }`}>
                      {lastWebhookResponse.status}
                    </span>
                  </div>

                  {/* Headers */}
                  <div className="text-[10px] font-mono text-slate-450 space-y-1">
                    <p className="text-slate-400 font-bold">Request Headers:</p>
                    {Object.entries(lastWebhookResponse.requestHeaders || {}).map(([k, v]: any) => (
                      <p key={k} className="pl-2"><b>{k}:</b> {v}</p>
                    ))}
                  </div>

                  {/* Body inspector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5 font-mono text-[9px]">
                    <div>
                      <p className="text-slate-400 font-bold text-[10px] mb-1">Post JSON Directive:</p>
                      <pre className="bg-slate-950 p-2 rounded-lg border border-slate-800 overflow-x-auto text-sky-400/90 leading-tight">
                        {JSON.stringify(lastWebhookResponse.payloadSent, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold text-[10px] mb-1">Response JSON Payload:</p>
                      <pre className="bg-slate-950 p-2 rounded-lg border border-slate-800 overflow-x-auto text-emerald-400/90 leading-tight">
                        {lastWebhookResponse.responsePayload 
                          ? JSON.stringify(lastWebhookResponse.responsePayload, null, 2)
                          : 'Waiting for endpoint reply...'
                        }
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
