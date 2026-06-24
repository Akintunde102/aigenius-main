import { CObject, Config } from '../types';
import { _accessModel, AccessModelArgs, AccessModelResponse, accessModelStream, StreamingResult } from './access-model';
import { LoginArgs, LoginResponse, _login } from './login';
import { SendOtpArgs, SendOtpResponse, _sendOtp } from './send-otp';
import {
  SendPushNotificationArgs,
  SendPushNotificationResponse,
  _sendPushNotification,
} from './send-push-notification';

export const getFunctions = (config: Config) => ({
  async sendOtp<T>(args: Omit<SendOtpArgs<T>, 'config'>): Promise<SendOtpResponse> {
    return _sendOtp({ ...args, config });
  },
  async login<T>(args: Omit<LoginArgs<T>, 'config'>): Promise<LoginResponse<T> | null> {
    return _login({ ...args, config });
  },
  async sendPushNotifications<T extends CObject>(
    args: Omit<SendPushNotificationArgs<T>, 'config'>,
  ): Promise<SendPushNotificationResponse> {
    return _sendPushNotification({ ...args, config });
  },
  async accessModel<T>(args: Omit<AccessModelArgs<T>, 'config'>): Promise<AccessModelResponse<T> | null> {
    return _accessModel({ ...args, config });
  },
  async accessModelStream<T>(args: Omit<AccessModelArgs<T> & {
    onData: (content: string | Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }>, reasoning?: string, reasoningDetails?: any[]) => void;
    onComplete?: (result: StreamingResult) => void;
    signal?: AbortSignal;
  }, 'config'>): Promise<StreamingResult> {
    return accessModelStream({ ...args, config });
  },
});
