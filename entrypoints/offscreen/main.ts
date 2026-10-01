import { onMessage } from '@/lib/messages';

onMessage('createObjectUrl', ({ data }) => URL.createObjectURL(new Blob([data.text], { type: data.type })));
