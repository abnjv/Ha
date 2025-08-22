import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    x: "-50px"
  },
  in: {
    opacity: 1,
    x: 0
  },
  out: {
    opacity: 0,
    x: "50px"
  }
};

const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.4
};

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%'
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
