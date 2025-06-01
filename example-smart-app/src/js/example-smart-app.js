(function(window) {
  window.extractData = async function() {
    try {
      // Get the SMART client
      const client = await FHIR.oauth2.ready();
      
      // Get patient resource
      const patient = await client.patient.read();
      
      // Get observations
      const observations = await client.patient.request(`Observation?${new URLSearchParams({
        code: [
          'http://loinc.org|8302-2',   // Height
          'http://loinc.org|8462-4',   // Diastolic BP
          'http://loinc.org|8480-6',   // Systolic BP
          'http://loinc.org|2085-9',   // HDL
          'http://loinc.org|2089-1',   // LDL
          'http://loinc.org|55284-4',  // BP
          'http://loinc.org|29463-7',  // Weight
          'http://loinc.org|39156-5',  // BMI
          'http://loinc.org|8310-5',   // Temperature
          'http://loinc.org|8867-4',   // Heart rate
          'http://loinc.org|2339-0'    // Glucose
        ].join(',')
      })}`);

      // Helper function to find observations by code
      const byCodes = (code) => {
        if (!observations.entry || !Array.isArray(observations.entry)) return [];
        return observations.entry
          .filter(entry => entry.resource.code.coding
            .some(coding => coding.code === code))
          .map(entry => entry.resource);
      };

      const p = {
        // Demographics
        fname: patient.name?.[0]?.given?.join(' ') || '',
        lname: patient.name?.[0]?.family || '',
        gender: patient.gender || '',
        birthdate: patient.birthDate || '',
        
        // Observations
        height: getQuantityValueAndUnit(byCodes('8302-2')[0]),
        weight: getQuantityValueAndUnit(byCodes('29463-7')[0]),
        bmi: getQuantityValueAndUnit(byCodes('39156-5')[0]),
        temperature: getQuantityValueAndUnit(byCodes('8310-5')[0]),
        heartrate: getQuantityValueAndUnit(byCodes('8867-4')[0]),
        glucose: getQuantityValueAndUnit(byCodes('2339-0')[0]),
        
        // Blood pressure requires special handling
        ...getBloodPressureValues(byCodes('55284-4')),
        
        // Cholesterol
        hdl: getQuantityValueAndUnit(byCodes('2085-9')[0]),
        ldl: getQuantityValueAndUnit(byCodes('2089-1')[0])
      };

      return p;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  };

  function getBloodPressureValues(BPObservations) {
    if (!BPObservations || !BPObservations[0]) return { systolicbp: '', diastolicbp: '' };
    
    const observation = BPObservations[0];
    const systolic = observation.component?.find(component => 
      component.code.coding.some(coding => coding.code === '8480-6')
    );
    const diastolic = observation.component?.find(component => 
      component.code.coding.some(coding => coding.code === '8462-4')
    );

    return {
      systolicbp: getQuantityValueAndUnit({ valueQuantity: systolic?.valueQuantity }) || '',
      diastolicbp: getQuantityValueAndUnit({ valueQuantity: diastolic?.valueQuantity }) || ''
    };
  }

  function getQuantityValueAndUnit(observation) {
    const valueQuantity = observation?.valueQuantity;
    if (!valueQuantity) return '';
    
    const { value, unit } = valueQuantity;
    if (typeof value !== 'number') return '';
    
    return `${value} ${unit || ''}`.trim();
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#weight').html(p.weight);
    $('#bmi').html(p.bmi);
    $('#temperature').html(p.temperature);
    $('#heartrate').html(p.heartrate);
    $('#glucose').html(p.glucose);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
  };
})(window);
