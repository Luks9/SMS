import React from 'react';

const StepIndicator = ({ currentStep, steps }) => {
  return (
    <div className="step-indicator" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const circleStyle = {
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isActive || isCompleted ? '#3273dc' : '#f5f5f5',
            color: isActive || isCompleted ? '#fff' : '#7a7a7a',
            fontWeight: isActive ? '700' : '500',
          };

          const connectorStyle = {
            flex: '1 1 auto',
            height: '2px',
            backgroundColor: isCompleted ? '#3273dc' : '#dbdbdb',
            marginTop: '1rem',
          };

          return (
            <React.Fragment key={step.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={circleStyle}>{step.id}</div>
                <div style={{ maxWidth: '12rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#3273dc' : '#363636' }}>
                    {step.title}
                  </div>
                  {step.description && (
                    <div style={{ fontSize: '0.75rem', color: '#7a7a7a' }}>{step.description}</div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && <div style={connectorStyle} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
