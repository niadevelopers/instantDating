
export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePhone = (phone) => {
  return /^(?:\+254|254|0)(?:7\d{8}|1\d{8})$/.test(phone);
};
