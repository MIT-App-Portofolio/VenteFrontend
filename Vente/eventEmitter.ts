import mitt from 'mitt';

type Events = {
  logout: void;
};

const emitter = mitt<Events>();

export default emitter;