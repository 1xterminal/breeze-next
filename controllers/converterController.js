const getConverter = async (req, res) => {
    try {
      return res.render('pages/converter/converter', {
        title: 'Temperature Converter',
        user: req.user,
        layout: 'layouts/main'
      });
    } catch (error) {
      console.error('Converter page error:', error);
      return res.render('pages/converter/converter', {
        title: 'Temperature Converter',
        user: req.user,
        error: 'Error loading converter page',
        layout: 'layouts/main'
      });
    }
  };
  
  module.exports = {
    getConverter
  };