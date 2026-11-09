import {watch} from 'vue';
export {notify} from '../../../site/assets/feedback.js';
import {notify} from '../../../site/assets/feedback.js';
export function watchFeedback(error,message){
 if(error)watch(error,value=>{if(value)notify(value,'error');});
 if(message)watch(message,value=>{if(value)notify(value,'success');});
}
